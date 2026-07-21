import { Hono } from 'hono';
import { requireAuth, requireTenantAdmin, type AuthEnv } from '../middleware/auth.js';
import { adminClient } from '../supabase.js';
import { getBillingProvider } from '../billing/provider.js';

export const billingRoutes = new Hono<AuthEnv>();

// webhook do gateway — público, autenticado por segredo compartilhado
billingRoutes.post('/webhook', async (c) => {
  const secret = process.env.BILLING_WEBHOOK_SECRET ?? '';
  if (!secret || c.req.header('x-webhook-secret') !== secret) {
    return c.json({ error: 'Assinatura de webhook inválida' }, 401);
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = getBillingProvider().parseWebhook(body);
  if (!parsed) return c.json({ error: 'Payload não reconhecido' }, 400);

  const admin = adminClient();
  const { data: assinatura } = await admin
    .from('assinaturas')
    .select('id, tenant_id')
    .eq('gateway_subscription_id', parsed.gateway_subscription_id)
    .maybeSingle();
  if (!assinatura) return c.json({ error: 'Assinatura não encontrada' }, 404);

  await admin.from('assinaturas').update({ status: parsed.status }).eq('id', assinatura.id);
  await admin
    .from('tenants')
    .update({ status_assinatura: parsed.status })
    .eq('id', assinatura.tenant_id);
  return c.json({ ok: true });
});

// rotas autenticadas (owner/admin)
billingRoutes.use('/*', requireAuth);

// estado atual da assinatura + catálogo de planos
billingRoutes.get('/', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('claims').tenant_id!;
  const [assinatura, tenant, planos] = await Promise.all([
    db
      .from('assinaturas')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('tenants').select('plano_id, status_assinatura, trial_expira_em').eq('id', tenantId).single(),
    db.from('planos').select('*').eq('ativo', true).order('preco_mensal'),
  ]);
  const erro = assinatura.error ?? tenant.error ?? planos.error;
  if (erro) return c.json({ error: erro.message }, 400);
  return c.json({
    assinatura: assinatura.data,
    tenant: tenant.data,
    planos: planos.data ?? [],
  });
});

// assinar/trocar de plano
billingRoutes.post('/assinar', requireTenantAdmin, async (c) => {
  const db = c.get('db');
  const tenantId = c.get('claims').tenant_id!;
  const { plano_id } = await c.req.json();

  const { data: plano, error: pErr } = await db
    .from('planos')
    .select('id, preco_mensal')
    .eq('id', plano_id)
    .single();
  if (pErr || !plano) return c.json({ error: 'Plano inválido' }, 400);

  const provider = getBillingProvider();
  const r = await provider.criarAssinatura({
    tenantId,
    planoId: plano.id,
    precoMensal: Number(plano.preco_mensal),
  });

  // assinaturas/tenants são escrita privilegiada (RLS só super-admin) — via service role.
  // A autorização já é garantida por requireTenantAdmin acima.
  const admin = adminClient();
  const { data: novaAssin, error: aErr } = await admin
    .from('assinaturas')
    .insert({
      tenant_id: tenantId,
      plano_id: plano.id,
      gateway: r.gateway,
      gateway_subscription_id: r.gateway_subscription_id,
      status: r.status,
      periodo_inicio: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();
  if (aErr || !novaAssin) return c.json({ error: aErr?.message ?? 'Falha ao assinar' }, 400);

  await admin
    .from('tenants')
    .update({ plano_id: plano.id, status_assinatura: r.status })
    .eq('id', tenantId);

  await db.rpc('registrar_auditoria', {
    p_tenant: tenantId,
    p_acao: 'assinar_plano',
    p_entidade: 'assinatura',
    p_entidade_id: novaAssin.id,
    p_payload: { plano_id: plano.id, status: r.status },
  });

  return c.json({ ok: true, status: r.status, checkout_url: r.checkout_url });
});

import { Hono } from 'hono';
import { requireAuth, requireSuperAdmin, type AuthEnv } from '../middleware/auth.js';

export const backofficeRoutes = new Hono<AuthEnv>();
backofficeRoutes.use('*', requireAuth, requireSuperAdmin);

// RLS de super-admin permite ver todos os tenants/instâncias
backofficeRoutes.get('/overview', async (c) => {
  const db = c.get('db');
  const [tenants, planos, instances] = await Promise.all([
    db
      .from('tenants')
      .select('id, nome, slug, status_assinatura, plano_id, override_limite_envios_mes, created_at'),
    db.from('planos').select('id, nome, preco_mensal, limite_envios_mes'),
    db.from('whatsapp_instances').select('tenant_id, numero, status, provider'),
  ]);
  if (tenants.error) return c.json({ error: tenants.error.message }, 400);
  return c.json({
    tenants: tenants.data ?? [],
    planos: planos.data ?? [],
    instances: instances.data ?? [],
  });
});

// suspender/reativar tenant (RF11.1)
backofficeRoutes.patch('/tenants/:id/status', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { status } = await c.req.json();
  const validos = ['trial', 'ativa', 'inadimplente', 'cancelada'];
  if (!validos.includes(status)) return c.json({ error: 'Status inválido' }, 400);
  const { error } = await db.from('tenants').update({ status_assinatura: status }).eq('id', id);
  if (error) return c.json({ error: error.message }, 400);
  await db.rpc('registrar_auditoria', {
    p_tenant: id,
    p_acao: 'tenant_status',
    p_entidade: 'tenant',
    p_entidade_id: id,
    p_payload: { status },
  });
  return c.json({ ok: true });
});

// override de limite de envios por tenant (RF11.3)
backofficeRoutes.patch('/tenants/:id/limite', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { override_limite_envios_mes } = await c.req.json();
  const valor =
    override_limite_envios_mes === null || override_limite_envios_mes === ''
      ? null
      : Number(override_limite_envios_mes);
  const { error } = await db
    .from('tenants')
    .update({ override_limite_envios_mes: valor })
    .eq('id', id);
  if (error) return c.json({ error: error.message }, 400);
  await db.rpc('registrar_auditoria', {
    p_tenant: id,
    p_acao: 'tenant_override_limite',
    p_entidade: 'tenant',
    p_entidade_id: id,
    p_payload: { override_limite_envios_mes: valor },
  });
  return c.json({ ok: true });
});

// impersonation auditada (RF11.5) — cliente deve renovar a sessão depois
backofficeRoutes.post('/impersonate', async (c) => {
  const { tenant_id } = await c.req.json();
  const { error } = await c.get('db').rpc('impersonar_tenant', { p_tenant_id: tenant_id });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

backofficeRoutes.post('/impersonate/stop', async (c) => {
  const { error } = await c.get('db').rpc('parar_impersonacao');
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// log de auditoria (RF11.6)
backofficeRoutes.get('/audit', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('audit_log')
    .select('id, tenant_id, ator_usuario_id, acao, entidade, entidade_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

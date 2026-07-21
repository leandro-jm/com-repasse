import { Hono } from 'hono';
import { requireAuth, requireTenantAdmin, type AuthEnv } from '../middleware/auth.js';

export const tenantRoutes = new Hono<AuthEnv>();
tenantRoutes.use('*', requireAuth);

// cria organização + owner (onboarding)
tenantRoutes.post('/', async (c) => {
  const { nome, slug } = await c.req.json();
  const { data, error } = await c.get('db').rpc('criar_tenant', { p_nome: nome, p_slug: slug });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ tenant_id: data });
});

// troca tenant ativo (regrava app_metadata; front deve renovar sessão)
tenantRoutes.post('/switch', async (c) => {
  const { tenant_id } = await c.req.json();
  const { error } = await c.get('db').rpc('set_active_tenant', { p_tenant_id: tenant_id });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// config completa do tenant ativo (template de campanha, white-label).
// O template de contrato saiu daqui: virou a tabela contrato_templates (RF8.3).
tenantRoutes.get('/config', async (c) => {
  const tenantId = c.get('claims').tenant_id;
  const { data, error } = await c
    .get('db')
    .from('tenants')
    .select('nome, cor_primaria, logo_url, dominio_custom, email_remetente, template_campanha')
    .eq('id', tenantId!)
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// atualiza dados do tenant ativo (nome, cor, white-label, template) — owner/admin
tenantRoutes.patch('/', requireTenantAdmin, async (c) => {
  const body = await c.req.json();
  const tenantId = c.get('claims').tenant_id;
  const patch: Record<string, unknown> = {};
  for (const k of [
    'nome',
    'cor_primaria',
    'logo_url',
    'dominio_custom',
    'email_remetente',
    'template_campanha',
  ]) {
    if (k in body) patch[k] = body[k] === '' ? null : body[k];
  }
  const { error } = await c.get('db').from('tenants').update(patch as never).eq('id', tenantId!);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

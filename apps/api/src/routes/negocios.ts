import { Hono } from 'hono';
import { negocioSchema } from '@crm/shared';
import { requireAuth, requireTenantAtivo, type AuthEnv } from '../middleware/auth.js';
import { validate, somentePresentes } from '../validate.js';

export const negocioRoutes = new Hono<AuthEnv>();
negocioRoutes.use('*', requireAuth, requireTenantAtivo);

const negocioUpdateSchema = negocioSchema.partial();
const tid = (c: { get: (k: 'claims') => { tenant_id: string | null } }) => c.get('claims').tenant_id!;

negocioRoutes.get('/', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('negocios')
    .select('*')
    .order('data_negocio', { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

negocioRoutes.post('/', async (c) => {
  const v = validate(negocioSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { data, error } = await c
    .get('db')
    .from('negocios')
    .insert({ ...v.data, tenant_id: tid(c) })
    .select('*')
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

negocioRoutes.patch('/:id', async (c) => {
  const raw = await c.req.json().catch(() => null);
  const v = validate(negocioUpdateSchema, raw);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const patch = somentePresentes(v.data, raw);
  const { error } = await c.get('db').from('negocios').update(patch).eq('id', c.req.param('id'));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// fotos de um negócio
negocioRoutes.get('/:id/fotos', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('negocio_fotos')
    .select('*')
    .eq('negocio_id', c.req.param('id'))
    .order('ordem');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// fontes de lead (dropdown controlado por tenant)
negocioRoutes.get('/meta/fontes', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('fontes_lead')
    .select('id, nome, tipo')
    .eq('ativo', true)
    .order('nome');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

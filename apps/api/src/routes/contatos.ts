import { Hono } from 'hono';
import { contatoSchema } from '@crm/shared';
import { requireAuth, requireTenantAtivo, type AuthEnv } from '../middleware/auth.js';
import { validate, somentePresentes } from '../validate.js';

export const contatoRoutes = new Hono<AuthEnv>();
contatoRoutes.use('*', requireAuth, requireTenantAtivo);

const contatoUpdateSchema = contatoSchema.partial();
const tid = (c: { get: (k: 'claims') => { tenant_id: string | null } }) => c.get('claims').tenant_id!;

contatoRoutes.get('/', async (c) => {
  const { data, error } = await c.get('db').from('contatos').select('*').order('nome');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

contatoRoutes.post('/', async (c) => {
  const v = validate(contatoSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { data, error } = await c
    .get('db')
    .from('contatos')
    .insert({ ...v.data, tenant_id: tid(c) })
    .select('*')
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

contatoRoutes.patch('/:id', async (c) => {
  const raw = await c.req.json().catch(() => null);
  const v = validate(contatoUpdateSchema, raw);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const patch = somentePresentes(v.data, raw);
  const { error } = await c.get('db').from('contatos').update(patch).eq('id', c.req.param('id'));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// importação em lote (CSV já parseado no front): valida linha a linha, ignora inválidas
contatoRoutes.post('/bulk', async (c) => {
  const body = await c.req.json().catch(() => null);
  const entrada = (body as { contatos?: unknown })?.contatos;
  if (!Array.isArray(entrada)) return c.json({ error: 'Lista de contatos inválida' }, 400);

  const rows = entrada
    .map((x) => contatoSchema.safeParse(x))
    .filter((r): r is Extract<typeof r, { success: true }> => r.success)
    .map((r) => ({ ...r.data, tenant_id: tid(c) }));

  if (rows.length === 0) return c.json({ inserted: 0, ignorados: entrada.length });

  const { error, count } = await c
    .get('db')
    .from('contatos')
    .insert(rows as never, { count: 'exact' });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ inserted: count ?? rows.length, ignorados: entrada.length - rows.length });
});

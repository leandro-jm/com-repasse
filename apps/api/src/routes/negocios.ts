import { Hono } from 'hono';
import { negocioSchema, fonteLeadSchema, documentoCompradorSchema } from '@crm/shared';
import { requireAuth, requireTenantAtivo, type AuthEnv } from '../middleware/auth.js';
import { validate, somentePresentes } from '../validate.js';

export const negocioRoutes = new Hono<AuthEnv>();
negocioRoutes.use('*', requireAuth, requireTenantAtivo);

const negocioUpdateSchema = negocioSchema.partial();
const fonteUpdateSchema = fonteLeadSchema.partial();
const documentoUpdateSchema = documentoCompradorSchema.partial();
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

// exclusão definitiva de um negócio (RLS filtra o tenant; select-primeiro p/ 404 real).
// FK cascade apaga negocio_fotos e contratos; SET NULL em custos/acordos/campanhas.
// As linhas somem sozinhas, mas os arquivos no storage não — limpamos aqui p/ não deixar órfãos.
negocioRoutes.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { data: neg } = await db.from('negocios').select('id').eq('id', id).maybeSingle();
  if (!neg) return c.json({ error: 'Negócio não encontrado' }, 404);

  // fotos: bucket público, url guarda o caminho após /object/public/fotos/
  const { data: fotos } = await db.from('negocio_fotos').select('url').eq('negocio_id', id);
  const fotoPaths = (fotos ?? [])
    .map((f) => (f.url as string | null)?.split('/object/public/fotos/')[1])
    .filter((p): p is string => Boolean(p));
  if (fotoPaths.length) await db.storage.from('fotos').remove(fotoPaths);

  // contratos gerados: bucket privado, pdf_url já é o caminho relativo
  const { data: contratos } = await db.from('contratos').select('pdf_url').eq('negocio_id', id);
  const pdfPaths = (contratos ?? [])
    .map((ct) => ct.pdf_url as string | null)
    .filter((p): p is string => Boolean(p));
  if (pdfPaths.length) await db.storage.from('contratos').remove(pdfPaths);

  const { error } = await db.from('negocios').delete().eq('id', id);
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

// fontes de lead (dropdown controlado por tenant) — só as ativas, p/ selects
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

// administração de fontes: lista todas (inclui inativas) p/ a tela de Configurações
negocioRoutes.get('/meta/fontes/todas', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('fontes_lead')
    .select('id, nome, tipo, ativo')
    .order('ativo', { ascending: false })
    .order('nome');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

negocioRoutes.post('/meta/fontes', async (c) => {
  const v = validate(fonteLeadSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { data, error } = await c
    .get('db')
    .from('fontes_lead')
    .insert({ ...v.data, tenant_id: tid(c) })
    .select('id, nome, tipo, ativo')
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// renomear / trocar tipo / ativar-desativar (soft-delete preserva o histórico)
negocioRoutes.patch('/meta/fontes/:id', async (c) => {
  const raw = await c.req.json().catch(() => null);
  const v = validate(fonteUpdateSchema, raw);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const patch = somentePresentes(v.data, raw);
  const { error } = await c
    .get('db')
    .from('fontes_lead')
    .update(patch)
    .eq('id', c.req.param('id'));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// documentos do comprador (dropdown controlado por tenant) — só ativos, p/ selects
negocioRoutes.get('/meta/documentos', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('documentos_comprador')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// administração de documentos: lista todos (inclui inativos) p/ a tela de Configurações
negocioRoutes.get('/meta/documentos/todas', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('documentos_comprador')
    .select('id, nome, ativo')
    .order('ativo', { ascending: false })
    .order('nome');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

negocioRoutes.post('/meta/documentos', async (c) => {
  const v = validate(documentoCompradorSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { data, error } = await c
    .get('db')
    .from('documentos_comprador')
    .insert({ ...v.data, tenant_id: tid(c) })
    .select('id, nome, ativo')
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// renomear / ativar-desativar (soft-delete preserva o histórico)
negocioRoutes.patch('/meta/documentos/:id', async (c) => {
  const raw = await c.req.json().catch(() => null);
  const v = validate(documentoUpdateSchema, raw);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const patch = somentePresentes(v.data, raw);
  const { error } = await c
    .get('db')
    .from('documentos_comprador')
    .update(patch)
    .eq('id', c.req.param('id'));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

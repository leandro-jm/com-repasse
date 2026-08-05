import { Hono } from 'hono';
import { encrypt, decrypt } from '@crm/shared/cripto';
import { whatsappCreateSchema, whatsappUpsertSchema } from '@crm/shared';
import { requireAuth, requireTenantAdmin, type AuthEnv } from '../middleware/auth.js';
import { validate } from '../validate.js';
import { assertUrlPublica } from '../ssrf.js';

export const whatsappRoutes = new Hono<AuthEnv>();
whatsappRoutes.use('*', requireAuth, requireTenantAdmin);

// nunca devolve a api_key ao browser — só indica se está configurada
whatsappRoutes.get('/', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('whatsapp_instances')
    .select(
      'id, provider, api_url, instance_name, numero, label, status, last_seen, api_key, throttle_min_ms, throttle_max_ms',
    )
    .order('created_at');
  if (error) return c.json({ error: error.message }, 400);
  const lista = (data ?? []).map(({ api_key, ...rest }) => ({ ...rest, tem_api_key: !!api_key }));
  return c.json(lista);
});

whatsappRoutes.post('/', async (c) => {
  const tenantId = c.get('claims').tenant_id!;
  const v = validate(whatsappCreateSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);

  // anti-SSRF: bloqueia URLs que resolvem para redes internas/metadata
  try {
    await assertUrlPublica(v.data.api_url);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'URL de API inválida' }, 400);
  }

  const { data, error } = await c
    .get('db')
    .from('whatsapp_instances')
    .insert({
      tenant_id: tenantId,
      provider: v.data.provider,
      api_url: v.data.api_url,
      instance_name: v.data.instance_name,
      numero: v.data.numero || null,
      label: v.data.label || null,
      throttle_min_ms: v.data.throttle_min_ms,
      throttle_max_ms: v.data.throttle_max_ms,
      api_key: encrypt(v.data.api_key) ?? undefined, // cifra em repouso
      // o pareamento é feito por fora (Evolution/processo manual); assume conectada
      status: 'conectada',
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505')
      return c.json({ error: 'Já existe uma conexão com esse nome de instância.' }, 409);
    return c.json({ error: error.message }, 400);
  }
  return c.json({ id: data.id });
});

whatsappRoutes.patch('/:id', async (c) => {
  const tenantId = c.get('claims').tenant_id!;
  const id = c.req.param('id');
  const v = validate(whatsappUpsertSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);

  // anti-SSRF: bloqueia URLs que resolvem para redes internas/metadata
  try {
    await assertUrlPublica(v.data.api_url);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'URL de API inválida' }, 400);
  }

  const payload: {
    provider: 'evolution' | 'cloud_api';
    api_url: string;
    instance_name: string;
    numero: string | null;
    label: string | null;
    throttle_min_ms: number;
    throttle_max_ms: number;
    api_key?: string;
  } = {
    provider: v.data.provider,
    api_url: v.data.api_url,
    instance_name: v.data.instance_name,
    numero: v.data.numero || null,
    label: v.data.label || null,
    throttle_min_ms: v.data.throttle_min_ms,
    throttle_max_ms: v.data.throttle_max_ms,
  };
  if (v.data.api_key) payload.api_key = encrypt(v.data.api_key) ?? undefined; // só troca se enviada
  const { error } = await c
    .get('db')
    .from('whatsapp_instances')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) {
    if (error.code === '23505')
      return c.json({ error: 'Já existe uma conexão com esse nome de instância.' }, 409);
    return c.json({ error: error.message }, 400);
  }
  return c.json({ ok: true });
});

whatsappRoutes.delete('/:id', async (c) => {
  const tenantId = c.get('claims').tenant_id!;
  const id = c.req.param('id');
  const { error } = await c
    .get('db')
    .from('whatsapp_instances')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---- Verificação de conexão (o pareamento é feito por fora do sistema) ----
async function conexaoPorId(
  c: { get: (k: 'db' | 'claims') => unknown },
  id: string,
): Promise<{ api_url: string; api_key: string; instance_name: string } | null> {
  const db = c.get('db') as import('../supabase.js').DB;
  const { data } = await db
    .from('whatsapp_instances')
    .select('api_url, api_key, instance_name')
    .eq('id', id) // RLS já escopa ao tenant do requisitante
    .maybeSingle();
  if (!data?.api_url || !data.api_key || !data.instance_name) return null;
  return {
    api_url: data.api_url,
    api_key: decrypt(data.api_key) ?? data.api_key,
    instance_name: data.instance_name,
  };
}

const evo = async (
  conn: { api_url: string; api_key: string },
  path: string,
  init: RequestInit = {},
) => {
  await assertUrlPublica(conn.api_url); // anti-SSRF também no ponto de saída (DNS pode mudar)
  return fetch(`${conn.api_url.replace(/\/$/, '')}/${path}`, {
    ...init,
    headers: { apikey: conn.api_key, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
};

// consulta o estado da conexão e atualiza whatsapp_instances.status
whatsappRoutes.get('/:id/status', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const conn = await conexaoPorId(c, id);
  if (!conn) return c.json({ status: 'desconectada' });
  const res = await evo(conn, `instance/connectionState/${conn.instance_name}`);
  const data = await res.json().catch(() => ({}));
  const state = data?.instance?.state ?? data?.state ?? 'close';
  const status = state === 'open' ? 'conectada' : 'desconectada';
  await db
    .from('whatsapp_instances')
    .update({ status, last_seen: new Date().toISOString() })
    .eq('id', id);
  return c.json({ status, state });
});

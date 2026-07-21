import { Hono } from 'hono';
import { encrypt, decrypt } from '@crm/shared/cripto';
import { whatsappUpsertSchema } from '@crm/shared';
import { requireAuth, requireTenantAdmin, type AuthEnv } from '../middleware/auth.js';
import { validate } from '../validate.js';
import { assertUrlPublica } from '../ssrf.js';

export const whatsappRoutes = new Hono<AuthEnv>();
whatsappRoutes.use('*', requireAuth, requireTenantAdmin);

// nunca devolve a api_key ao browser — só indica se está configurada
whatsappRoutes.get('/', async (c) => {
  const tenantId = c.get('claims').tenant_id!;
  const { data, error } = await c
    .get('db')
    .from('whatsapp_instances')
    .select('provider, api_url, instance_name, numero, status, last_seen, api_key')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 400);
  if (!data) return c.json(null);
  const { api_key, ...rest } = data;
  return c.json({ ...rest, tem_api_key: !!api_key });
});

whatsappRoutes.put('/', async (c) => {
  const tenantId = c.get('claims').tenant_id!;
  const v = validate(whatsappUpsertSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);

  // anti-SSRF: bloqueia URLs que resolvem para redes internas/metadata
  try {
    await assertUrlPublica(v.data.api_url);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'URL de API inválida' }, 400);
  }

  const payload: {
    tenant_id: string;
    provider: 'evolution' | 'cloud_api';
    api_url: string;
    instance_name: string;
    numero: string | null;
    api_key?: string;
  } = {
    tenant_id: tenantId,
    provider: v.data.provider,
    api_url: v.data.api_url,
    instance_name: v.data.instance_name,
    numero: v.data.numero || null,
  };
  if (v.data.api_key) payload.api_key = encrypt(v.data.api_key) ?? undefined; // cifra em repouso
  const { error } = await c
    .get('db')
    .from('whatsapp_instances')
    .upsert(payload, { onConflict: 'tenant_id' });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---- Provisionamento multi-instância + QR (RF3.9) ----
async function conexao(c: {
  get: (k: 'db' | 'claims') => unknown;
}): Promise<{ api_url: string; api_key: string; instance_name: string } | null> {
  const db = c.get('db') as import('../supabase.js').DB;
  const tenantId = (c.get('claims') as { tenant_id: string }).tenant_id;
  const { data } = await db
    .from('whatsapp_instances')
    .select('api_url, api_key, instance_name')
    .eq('tenant_id', tenantId)
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

// cria a instância no servidor Evolution do tenant
whatsappRoutes.post('/provisionar', async (c) => {
  const conn = await conexao(c);
  if (!conn) return c.json({ error: 'Configure api_url, api_key e instância primeiro' }, 400);
  const res = await evo(conn, 'instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: conn.instance_name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 403)
    return c.json({ error: `Evolution ${res.status}: ${JSON.stringify(data).slice(0, 200)}` }, 400);
  return c.json({ ok: true, qr: data?.qrcode?.base64 ?? data?.base64 ?? null });
});

// obtém o QR code para parear o número
whatsappRoutes.get('/qr', async (c) => {
  const conn = await conexao(c);
  if (!conn) return c.json({ error: 'Conexão não configurada' }, 400);
  const res = await evo(conn, `instance/connect/${conn.instance_name}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return c.json({ error: `Evolution ${res.status}` }, 400);
  return c.json({ base64: data?.base64 ?? data?.qrcode?.base64 ?? null, code: data?.code ?? null });
});

// consulta o estado da conexão e atualiza whatsapp_instances.status
whatsappRoutes.get('/status', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('claims').tenant_id!;
  const conn = await conexao(c);
  if (!conn) return c.json({ status: 'desconectada' });
  const res = await evo(conn, `instance/connectionState/${conn.instance_name}`);
  const data = await res.json().catch(() => ({}));
  const state = data?.instance?.state ?? data?.state ?? 'close';
  const status = state === 'open' ? 'conectada' : 'desconectada';
  await db
    .from('whatsapp_instances')
    .update({ status, last_seen: new Date().toISOString() })
    .eq('tenant_id', tenantId);
  return c.json({ status, state });
});

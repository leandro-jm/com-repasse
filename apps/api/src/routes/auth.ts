import { Hono } from 'hono';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = new Hono();

const gotrue = (path: string, body: unknown, extraHeaders: Record<string, string> = {}) =>
  fetch(`${env.SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });

authRoutes.post('/signup', async (c) => {
  const { email, password, nome } = await c.req.json();
  const res = await gotrue('signup', { email, password, data: { nome } });
  const data = await res.json();
  if (!res.ok) return c.json({ error: data.msg ?? data.error_description ?? 'Falha no cadastro' }, 400);
  return c.json(data);
});

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const res = await gotrue('token?grant_type=password', { email, password });
  const data = await res.json();
  if (!res.ok) return c.json({ error: data.error_description ?? 'Credenciais inválidas' }, 401);
  return c.json(data);
});

authRoutes.post('/refresh', async (c) => {
  const { refresh_token } = await c.req.json();
  const res = await gotrue('token?grant_type=refresh_token', { refresh_token });
  const data = await res.json();
  if (!res.ok) return c.json({ error: 'Não foi possível renovar a sessão' }, 401);
  return c.json(data);
});

authRoutes.post('/logout', requireAuth, async (c) => {
  await gotrue('logout', {}, { Authorization: `Bearer ${c.get('token')}` });
  return c.json({ ok: true });
});

// dados do usuário logado + suas associações a tenants
authRoutes.get('/me', requireAuth, async (c) => {
  const db = c.get('db');
  const claims = c.get('claims');
  const { data, error } = await db
    .from('tenant_usuarios')
    .select('tenant_id, papel, tenants(nome, slug, logo_url, cor_primaria)')
    .eq('ativo', true)
    .eq('usuario_id', claims.sub); // só os tenants DESTE usuário (não co-membros)
  if (error) return c.json({ error: error.message }, 400);

  const memberships = (data ?? [])
    .filter((r) => r.tenants)
    .map((r) => ({
      tenant_id: r.tenant_id,
      papel: r.papel,
      ...(r.tenants as { nome: string; slug: string; logo_url: string | null; cor_primaria: string | null }),
    }));

  // Impersonation (RF11.5): super-admin operando num tenant do qual não é membro
  let impersonating = null;
  if (
    claims.is_super_admin &&
    claims.tenant_id &&
    !memberships.some((m) => m.tenant_id === claims.tenant_id)
  ) {
    const { data: t } = await db
      .from('tenants')
      .select('id, nome, slug, logo_url, cor_primaria')
      .eq('id', claims.tenant_id)
      .single();
    if (t) {
      impersonating = {
        tenant_id: t.id,
        papel: 'owner' as const,
        nome: t.nome,
        slug: t.slug,
        logo_url: t.logo_url,
        cor_primaria: t.cor_primaria,
      };
    }
  }

  return c.json({ user: { id: claims.sub, email: claims.email }, claims, memberships, impersonating });
});

import { Hono } from 'hono';
import { perfilUpdateSchema } from '@crm/shared';
import { requireAuth, type AuthEnv } from '../middleware/auth.js';
import { adminClient } from '../supabase.js';
import { env } from '../env.js';
import { validate, somentePresentes } from '../validate.js';

export const perfilRoutes = new Hono<AuthEnv>();
perfilRoutes.use('*', requireAuth);

// dados do próprio usuário
perfilRoutes.get('/', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('usuarios')
    .select('id, nome, email, telefone')
    .eq('id', c.get('claims').sub)
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// atualiza nome/telefone (RLS: usuarios_update_self). Update parcial: só grava o que veio.
perfilRoutes.patch('/', async (c) => {
  const raw = await c.req.json().catch(() => null);
  const v = validate(perfilUpdateSchema, raw);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const patch = somentePresentes(v.data, raw);
  if (Object.keys(patch).length === 0) return c.json({ ok: true });
  const { error } = await c
    .get('db')
    .from('usuarios')
    .update(patch)
    .eq('id', c.get('claims').sub);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// troca de senha — confirma a senha atual e aplica a nova via service role
perfilRoutes.post('/senha', async (c) => {
  const { senha_atual, nova_senha } = await c.req.json();
  const email = c.get('claims').email;
  if (!nova_senha || String(nova_senha).length < 6) {
    return c.json({ error: 'A nova senha deve ter ao menos 6 caracteres' }, 400);
  }
  if (!email) return c.json({ error: 'E-mail do usuário indisponível' }, 400);

  // confirma a senha atual autenticando no GoTrue
  const check = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha_atual }),
  });
  if (!check.ok) return c.json({ error: 'Senha atual incorreta' }, 400);

  let admin;
  try {
    admin = adminClient();
  } catch {
    return c.json({ error: 'Troca de senha indisponível: service role não configurado' }, 501);
  }
  const { error } = await admin.auth.admin.updateUserById(c.get('claims').sub, {
    password: nova_senha,
  });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

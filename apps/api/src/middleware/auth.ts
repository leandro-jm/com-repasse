import { createMiddleware } from 'hono/factory';
import type { Papel } from '@crm/shared';
import { userClient, type DB } from '../supabase.js';

export interface Claims {
  sub: string;
  email?: string;
  tenant_id: string | null;
  papel: Papel | null;
  is_super_admin: boolean;
}

export type AuthEnv = {
  Variables: {
    db: DB;
    token: string;
    claims: Claims;
  };
};

function decode(token: string): Claims | null {
  try {
    const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (!p.sub) return null;
    return {
      sub: p.sub,
      email: p.email,
      tenant_id: p.tenant_id ?? null,
      papel: p.papel ?? null,
      is_super_admin: !!p.is_super_admin,
    };
  } catch {
    return null;
  }
}

/**
 * Exige Bearer token válido. Cria um client Supabase com o JWT do usuário
 * (RLS ativa) e o valida chamando auth.getUser (rejeita token expirado/adulterado).
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'Não autenticado' }, 401);

  const claims = decode(token);
  if (!claims) return c.json({ error: 'Token inválido' }, 401);

  const db = userClient(token);
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return c.json({ error: 'Sessão expirada' }, 401);

  c.set('db', db);
  c.set('token', token);
  c.set('claims', claims);
  await next();
});

/** Exige papel de admin do tenant (owner/admin). */
export const requireTenantAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const { papel, is_super_admin } = c.get('claims');
  if (!is_super_admin && papel !== 'owner' && papel !== 'admin') {
    return c.json({ error: 'Sem permissão' }, 403);
  }
  await next();
});

/** Exige que o papel do usuário esteja entre os permitidos (super-admin sempre passa). */
export const requirePapel = (papeis: readonly Papel[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const { papel, is_super_admin } = c.get('claims');
    if (!is_super_admin && !(papel && papeis.includes(papel))) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    await next();
  });

/** Exige super-admin da plataforma. */
export const requireSuperAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  if (!c.get('claims').is_super_admin) return c.json({ error: 'Acesso restrito' }, 403);
  await next();
});

/**
 * Bloqueia rotas de DADOS quando o tenant está suspenso (status cancelada).
 * Não aplicar em auth/tenants (senão o usuário fica preso e não troca de tenant).
 * Super-admin passa (inclusive personificando, p/ dar suporte).
 */
export const requireTenantAtivo = createMiddleware<AuthEnv>(async (c, next) => {
  const { tenant_id, is_super_admin } = c.get('claims');
  if (!is_super_admin && tenant_id) {
    const { data } = await c
      .get('db')
      .from('tenants')
      .select('status_assinatura')
      .eq('id', tenant_id)
      .single();
    if (data?.status_assinatura === 'cancelada') {
      return c.json({ error: 'Organização suspensa. Fale com o suporte.' }, 403);
    }
  }
  await next();
});

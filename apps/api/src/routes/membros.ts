import { Hono } from 'hono';
import { PAPEIS, type Papel } from '@crm/shared';
import { requireAuth, requireTenantAdmin, type AuthEnv } from '../middleware/auth.js';
import { adminClient } from '../supabase.js';

export const membroRoutes = new Hono<AuthEnv>();
membroRoutes.use('*', requireAuth, requireTenantAdmin);

// lista membros do tenant ativo (RF9.2)
membroRoutes.get('/', async (c) => {
  const tenantId = c.get('claims').tenant_id!;
  const { data, error } = await c
    .get('db')
    .from('tenant_usuarios')
    .select('usuario_id, papel, ativo, usuarios(nome, email)')
    .eq('tenant_id', tenantId)
    .order('created_at');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(
    (data ?? []).map((m) => ({
      usuario_id: m.usuario_id,
      papel: m.papel,
      ativo: m.ativo,
      ...(m.usuarios as { nome: string | null; email: string } | null),
    })),
  );
});

/** true se o ator pode conceder/alterar/remover o papel de owner. */
const atorEhOwner = (claims: { papel: string | null; is_super_admin: boolean }) =>
  claims.is_super_admin || claims.papel === 'owner';

/** Papel atual de um membro no tenant ativo (ou null se não existe). */
async function papelDoMembro(
  db: import('../supabase.js').DB,
  tenantId: string,
  usuarioId: string,
): Promise<Papel | null> {
  const { data } = await db
    .from('tenant_usuarios')
    .select('papel')
    .eq('tenant_id', tenantId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  return (data?.papel as Papel | undefined) ?? null;
}

/** Impede esvaziar o tenant de owners (retorna true se há outro owner ativo além do alvo). */
async function restariaOwner(
  db: import('../supabase.js').DB,
  tenantId: string,
  alvoId: string,
): Promise<boolean> {
  const { count } = await db
    .from('tenant_usuarios')
    .select('usuario_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('papel', 'owner')
    .eq('ativo', true)
    .neq('usuario_id', alvoId);
  return (count ?? 0) >= 1;
}

/** Comprimento mínimo de senha (alinhado ao default do Supabase Auth). */
const SENHA_MIN = 6;

// cadastra usuário: cria no Auth com a senha definida pelo admin (se novo) e
// vincula ao tenant com um papel. Se o e-mail já existe, só cria o vínculo.
membroRoutes.post('/', async (c) => {
  const { email, nome, senha, papel } = await c.req.json();
  const claims = c.get('claims');
  const tenantId = claims.tenant_id!;
  if (!(PAPEIS as readonly string[]).includes(papel)) return c.json({ error: 'Papel inválido' }, 400);
  if (!email) return c.json({ error: 'Informe o e-mail' }, 400);
  // só owner/super-admin concede o papel owner (evita auto-promoção de admin)
  if (papel === 'owner' && !atorEhOwner(claims)) {
    return c.json({ error: 'Apenas o owner pode conceder o papel owner' }, 403);
  }

  let admin;
  try {
    admin = adminClient();
  } catch {
    return c.json({ error: 'Cadastro indisponível: service role não configurado' }, 501);
  }

  // já existe usuário com esse e-mail?
  const { data: existente } = await admin
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let usuarioId = existente?.id;
  const criado = !usuarioId;

  if (!usuarioId) {
    // usuário novo: senha é obrigatória (admin a define no cadastro)
    if (typeof senha !== 'string' || senha.length < SENHA_MIN) {
      return c.json({ error: `A senha deve ter ao menos ${SENHA_MIN} caracteres` }, 400);
    }
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nome ?? null },
    });
    if (cErr || !created.user) return c.json({ error: cErr?.message ?? 'Falha ao criar usuário' }, 400);
    usuarioId = created.user.id;
  }

  // vínculo respeitando RLS (owner/admin do tenant ativo)
  const { error: mErr } = await c
    .get('db')
    .from('tenant_usuarios')
    .upsert(
      { tenant_id: tenantId, usuario_id: usuarioId, papel: papel as Papel, ativo: true },
      { onConflict: 'tenant_id,usuario_id' },
    );
  if (mErr) return c.json({ error: mErr.message }, 400);

  await c.get('db').rpc('registrar_auditoria', {
    p_tenant: tenantId,
    p_acao: 'cadastro_usuario',
    p_entidade: 'usuario',
    p_entidade_id: usuarioId,
    p_payload: { email, papel },
  });

  return c.json({ ok: true, usuario_id: usuarioId, criado });
});

// altera papel de um membro (não pode alterar a si mesmo, evita lock-out)
membroRoutes.patch('/:usuarioId', async (c) => {
  const alvo = c.req.param('usuarioId');
  const { papel } = await c.req.json();
  const claims = c.get('claims');
  const db = c.get('db');
  const tenantId = claims.tenant_id!;
  if (alvo === claims.sub) return c.json({ error: 'Você não pode alterar seu próprio papel' }, 400);
  if (!(PAPEIS as readonly string[]).includes(papel)) return c.json({ error: 'Papel inválido' }, 400);

  const papelAtual = await papelDoMembro(db, tenantId, alvo);
  if (!papelAtual) return c.json({ error: 'Membro não encontrado' }, 404);
  // só owner mexe em owner; só owner concede owner
  if ((papelAtual === 'owner' || papel === 'owner') && !atorEhOwner(claims)) {
    return c.json({ error: 'Apenas o owner pode gerenciar o papel owner' }, 403);
  }
  // rebaixar o último owner deixaria o tenant sem dono
  if (papelAtual === 'owner' && papel !== 'owner' && !(await restariaOwner(db, tenantId, alvo))) {
    return c.json({ error: 'O tenant precisa de ao menos um owner' }, 400);
  }

  const { error } = await db
    .from('tenant_usuarios')
    .update({ papel: papel as Papel })
    .eq('tenant_id', tenantId)
    .eq('usuario_id', alvo);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// remove um membro do tenant (não pode remover a si mesmo)
membroRoutes.delete('/:usuarioId', async (c) => {
  const alvo = c.req.param('usuarioId');
  const claims = c.get('claims');
  const db = c.get('db');
  const tenantId = claims.tenant_id!;
  if (alvo === claims.sub) return c.json({ error: 'Você não pode remover a si mesmo' }, 400);

  const papelAtual = await papelDoMembro(db, tenantId, alvo);
  if (!papelAtual) return c.json({ error: 'Membro não encontrado' }, 404);
  if (papelAtual === 'owner' && !atorEhOwner(claims)) {
    return c.json({ error: 'Apenas o owner pode remover um owner' }, 403);
  }
  if (papelAtual === 'owner' && !(await restariaOwner(db, tenantId, alvo))) {
    return c.json({ error: 'O tenant precisa de ao menos um owner' }, 400);
  }

  const { error } = await db
    .from('tenant_usuarios')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('usuario_id', alvo);
  if (error) return c.json({ error: error.message }, 400);
  await c.get('db').rpc('registrar_auditoria', {
    p_tenant: claims.tenant_id!,
    p_acao: 'remover_usuario',
    p_entidade: 'usuario',
    p_entidade_id: alvo,
    p_payload: {},
  });
  return c.json({ ok: true });
});

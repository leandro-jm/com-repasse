---
type: adr
id: ADR-0003
status: aceita
domain: iam
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-tenants-iam-rbac, spec-backoffice-superadmin]
---

# ADR-0003 — IAM: Supabase Auth + claims de tenant via `custom_access_token_hook`

## Contexto

A RLS ([ADR-0001](adr-0001-isolamento-multitenant-rls.md)) depende de o `tenant_id` e o papel do usuário chegarem confiáveis a cada query. Um usuário pode pertencer a mais de um tenant (`tenant_usuarios` é N:N com papel). Precisamos de um IAM que injete essas informações no token de forma que o Postgres consiga ler, sem confiar no cliente.

## Decisão

**Supabase Auth (GoTrue) como IdP + custom claims injetados no JWT por um hook de banco.** A função `public.custom_access_token_hook` (habilitada em `supabase/config.toml`, `[auth.hook.custom_access_token]`) injeta em todo JWT emitido: `tenant_id` (tenant ativo, de `auth.users.raw_app_meta_data.active_tenant_id`, com fallback pra primeira associação ativa), `papel` e `is_super_admin`.

- Trocar de tenant ativo = `set_active_tenant(uuid)` atualiza `app_metadata`; o cliente **refaz a sessão** para reemitir o JWT com o novo tenant.
- A API valida o token server-side com `db.auth.getUser()` e monta `Claims { sub, email, tenant_id, papel, is_super_admin }` (`apps/api/src/middleware/auth.ts`), com guards `requireAuth`, `requireTenantAdmin`, `requirePapel([...])`, `requireSuperAdmin`, `requireTenantAtivo`.
- Provisionamento no signup: trigger `on_auth_user_created` → `handle_new_user()` espelha `auth.users` em `public.usuarios`.

**Keycloak** fica registrado como caminho de evolução futura (IAM centralizado / SSO enterprise), explicitamente fora do MVP.

## Alternativas consideradas

- **Keycloak / IdP dedicado agora** — poder e SSO, mas peso operacional desnecessário pro MVP. Adiado.
- **`tenant_id` só no banco de aplicação (sem claim no JWT)** — obrigaria a RLS a consultar tabelas de associação a cada linha; mais lento e mais frágil. Rejeitado.
- **Claim de tenant escrito pelo cliente** — inseguro (cliente poderia forjar). Rejeitado — o hook roda no banco, sob `supabase_auth_admin`.

## Consequências

### Positivas

- RLS lê tenant/papel direto do JWT — rápido e confiável.
- Multi-tenant por usuário (troca de tenant) suportado sem re-login, só refresh.
- Papel no token habilita RBAC uniforme na API (RB9).

### Negativas · trade-offs

- Trocar de tenant exige refresh de sessão (JWT reemitido) — o front precisa orquestrar isso.
- O hook é lógica crítica de segurança em SQL; mudanças nele exigem revisão cuidadosa.
- Hook hospedado (Supabase Cloud) só vale se configurado no projeto (push/dashboard), não só no `config.toml` local.

## Referências

- PRD `PRD_CRM_Carvalho_Junior.md §7.2`
- `supabase/config.toml` (`[auth.hook.custom_access_token]`)
- `supabase/migrations/20260701000200_rls_and_auth.sql`, `20260702000000_finalizacoes.sql` (redefine o hook)
- `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/auth.ts`
- Specs: `docs/specs/spec-tenants-iam-rbac.md`

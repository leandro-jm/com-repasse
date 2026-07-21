---
type: adr
id: ADR-0001
status: aceita
domain: multi-tenancy
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-tenants-iam-rbac, spec-campanhas-whatsapp, spec-financeiro-dre]
---

# ADR-0001 — Isolamento multi-tenant por RLS (banco único, `tenant_id` por linha)

## Contexto

O produto é um SaaS B2B vendido para vários lojistas de repasse, cada um um **tenant** com dados sensíveis (contatos, valores de negócio, DRE). Vazar dados entre tenants é "o risco nº 1 de qualquer SaaS" (PRD §11). Precisamos de isolamento forte sem multiplicar o custo operacional por cliente, já que o alvo comercial inclui muitos tenants pequenos.

## Decisão

**Banco único, schema único, `tenant_id` em cada linha, isolamento por Row Level Security (RLS) do Postgres.** O `tenant_id` do usuário viaja como **claim no JWT** (ver [ADR-0003](adr-0003-iam-supabase-auth-jwt-hook.md)); as *policies* RLS filtram automaticamente por esse claim. Mesmo um bug na aplicação não vaza dados de outro tenant — a barreira final é o banco.

Na prática: toda tabela CRM (`contatos`, `negocios`, `campanhas`, `acordos`, `contratos`, ...) carrega `tenant_id NOT NULL`. As policies são geradas de forma uniforme por um loop `do $$ ... foreach` em `supabase/migrations/20260701000200_rls_and_auth.sql`: `SELECT` para qualquer membro do tenant; `INSERT/UPDATE/DELETE` para não-viewer do tenant ativo; super-admin sempre. Helpers `auth_tenant_id()`, `auth_papel()`, `is_super_admin()`, `auth_can_write()` leem o JWT. Storage também: buckets com RLS por prefixo de path (`(storage.foldername(name))[1] = auth_tenant_id()`).

## Alternativas consideradas

- **Schema por tenant** — bom isolamento, mas complexidade de migração multiplicada por N schemas; descartado para o MVP.
- **Banco por tenant** — isolamento físico máximo, custo/ops altíssimo; adiado. Reavaliar só se surgir cliente enterprise com exigência de isolamento físico.
- **Isolar só na aplicação (WHERE tenant_id)** — um único `WHERE` esquecido vaza tudo; sem rede de segurança. Rejeitado.

## Consequências

### Positivas

- Isolamento garantido no nível do banco, independente de bug de aplicação (RB7).
- Uma migração serve todos os tenants; onboarding de tenant é uma linha (`criar_tenant`).
- Custo operacional plano — um cluster serve todos.

### Negativas · trade-offs

- Toda query depende do claim correto no JWT; trocar de tenant ativo exige reemitir o JWT (refresh de sessão).
- Super-admin precisa de policy própria e **auditada** para cruzar tenants ([ADR-0011](adr-0011-defesa-em-profundidade-jwt-ssrf.md), impersonation).
- Exige testes automatizados de isolamento como parte do CI (garantir que nenhuma policy nova abra brecha).

## Referências

- PRD `PRD_CRM_Carvalho_Junior.md §7.1`, Apêndice B, regra RB7 (§8)
- `supabase/migrations/20260701000200_rls_and_auth.sql` (policies, helpers)
- `supabase/migrations/20260701000000_saas_core.sql` (`tenants`, `tenant_usuarios`)
- Specs: `docs/specs/spec-tenants-iam-rbac.md`

---
type: spec
issue_type: feature
category: feature
status: done
domain: tenants
owner: Produto (Niflow)
branch: feat/tenants-iam-rbac
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [TENANTS] Tenants, IAM e RBAC

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

O produto é vendido para vários lojistas. Cada um precisa dos seus dados isolados, dos seus usuários com papéis diferentes (dono, operador, financeiro, viewer) e da garantia de que ninguém vê o dado de outro. Sem isso, não há SaaS.

### 1.2 Objetivo

Suportar múltiplos tenants isolados, com usuários N:N, papéis (RBAC) e troca de tenant ativo, garantindo isolamento no nível do banco.

### 1.3 Contexto de negócio

Fundação SaaS (PRD §7.1/§7.2, módulo 9). É a base de todos os demais módulos. Detalha [ADR-0001](../adr/adr-0001-isolamento-multitenant-rls.md) e [ADR-0003](../adr/adr-0003-iam-supabase-auth-jwt-hook.md).

### 1.4 Regras de negócio

- RN-01 (RB7): toda leitura/escrita é filtrada por `tenant_id` via RLS; nenhuma query cruza tenants (exceto super-admin, com policy própria auditada).
- RN-02 (RB9): cada ação valida o papel do usuário no tenant (owner/admin/operador/financeiro/viewer).
- RN-03: um usuário pode pertencer a vários tenants (`tenant_usuarios` N:N + papel); há um tenant ativo por sessão.
- RN-04: trocar de tenant ativo reemite o JWT (refresh).
- RN-05: tenant cancelado bloqueia rotas de dados (`requireTenantAtivo`; super-admin bypassa).

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Vazamentos entre tenants | incidentes | 0 | — | > 0 |
| Tenants ativos | contagem | crescente | — | — |

### 1.6 Escopo

ENTRA: tenants, membros com papéis, troca de tenant ativo, RLS uniforme, guards de papel na API.
NÃO ENTRA: SSO/Keycloak (evolução futura); SCIM.

### 1.7 Stakeholders

- Quem pediu: plataforma (Niflow). Quem valida: Arquitetura. Quem usa: Owner/Admin (gestão de membros).

### 1.8 Critérios de aceite (visão PM)

- [x] Dois tenants não veem dados um do outro (seed prova isolamento).
- [x] Papéis restringem ações (RBAC).
- [x] Trocar de tenant ativo funciona.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built). Keycloak/SSO fica como evolução futura (PRD §7.2).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Owner convidando o operador e o financeiro; usuário que atende dois lojistas trocando de tenant.

### 2.2 Fluxo do usuário

Usuários → convida membro com papel → membro entra. Header → troca tenant ativo (refresh de sessão).

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Usuarios.tsx`; seletor de tenant no `AppShell`/`providers/session.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Table/Badge/Select | sim | papel/tenant |

### 2.5 Estados e edge cases

- Usuário sem tenant: cai no onboarding ([spec-onboarding-whitelabel](spec-onboarding-whitelabel.md)).
- Tenant cancelado: rotas de dados bloqueadas.
- Viewer: só leitura.

### 2.6 Critérios de aceite (visão UX)

- [x] Gestão de membros por papel.
- [x] Troca de tenant clara.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Supabase Auth + hook JWT + RLS.

### 3.2 Arquitetura

- Rotas: `apps/api/src/routes/tenants.ts` (criar/trocar/config), `apps/api/src/routes/membros.ts` (CRUD de membros, usa `adminClient` para criar usuários de auth), `apps/api/src/routes/perfil.ts`.
- Middleware: `apps/api/src/middleware/auth.ts` (`requireAuth`, `requireTenantAdmin`, `requirePapel`, `requireSuperAdmin`, `requireTenantAtivo`).
- Schema/RLS: `tenants`, `usuarios`, `tenant_usuarios`, enum `papel_tenant` (`20260701000000_saas_core.sql`); hook + policies + helpers `auth_tenant_id()`/`auth_papel()`/`is_super_admin()` (`20260701000200_rls_and_auth.sql`); `criar_tenant`, `handle_new_user`, `set_active_tenant`.

### 3.3 Decisões técnicas

RLS como barreira final ([ADR-0001](../adr/adr-0001-isolamento-multitenant-rls.md)); claims via hook ([ADR-0003](../adr/adr-0003-iam-supabase-auth-jwt-hook.md)); JWT validado server-side ([ADR-0011](../adr/adr-0011-defesa-em-profundidade-jwt-ssrf.md)).

### 3.4 Estimativa de complexidade

Alta — fundação de segurança/multi-tenancy.

### 3.5 Critérios de aceite (visão Tech)

- [x] Policies uniformes cobrem todas as tabelas CRM.
- [x] Guards de papel na API; JWT validado.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Tenants isolados por RLS, membros N:N com papéis, guards de RBAC na API, troca de tenant ativo com refresh de JWT, bloqueio de tenant cancelado.

### 4.2 Desvios do planejado

Nenhum estrutural; policies geradas por loop para uniformidade.

### 4.3 Validação (QA)

- [x] Seed com dois tenants (Carvalho Júnior + Repasse Silva) prova isolamento.
- [x] Papéis restringem ações; viewer só lê.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

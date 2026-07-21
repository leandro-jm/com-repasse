---
type: spec
issue_type: feature
category: feature
status: done
domain: backoffice
owner: Produto (Niflow)
branch: feat/backoffice-superadmin
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [BACKOFFICE] Back-office e super-admin da plataforma

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

A plataforma (Niflow) precisa administrar todos os tenants: criar/suspender contas, definir planos, monitorar a saúde das instâncias de WhatsApp e dar suporte entrando na conta do cliente — sem virar uma brecha de isolamento nem operar sem rastro.

### 1.2 Objetivo

Dar ao super-admin um back-office para gerir tenants, planos e limites, monitorar WhatsApp e prestar suporte via impersonation **auditada**.

### 1.3 Contexto de negócio

Camada de plataforma (PRD §7 / módulo 11), fora de qualquer tenant. Detalha o lado super-admin de [ADR-0001](../adr/adr-0001-isolamento-multitenant-rls.md) e [ADR-0011](../adr/adr-0011-defesa-em-profundidade-jwt-ssrf.md).

### 1.4 Regras de negócio

- RN-01: super-admin é papel de plataforma (`is_super_admin`), fora do modelo de tenant; tem policy própria para cruzar tenants.
- RN-02: toda ação sensível (impersonation, mudança de status/limite) é registrada em `audit_log`.
- RN-03: impersonation é temporária e reversível (`impersonar_tenant`/`parar_impersonacao`), sinalizada ao usuário (`/auth/me` → `impersonating`).

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Instâncias WhatsApp saudáveis | conectadas ÷ total | 100% | — | baixa |
| Ações auditadas | cobertura | 100% | — | < 100% |

### 1.6 Escopo

ENTRA: visão geral de tenants, criar/suspender, ajustar status/limite, monitorar WhatsApp, impersonation auditada, leitura de auditoria.
NÃO ENTRA: billing gateway (ver [spec-planos-assinaturas](spec-planos-assinaturas.md)).

### 1.7 Stakeholders

- Quem pediu: plataforma (Niflow). Quem valida: Arquitetura/Suporte. Quem usa: super-admin.

### 1.8 Critérios de aceite (visão PM)

- [x] Super-admin vê e administra todos os tenants.
- [x] Impersonation funciona e fica auditada.
- [x] Ações sensíveis registradas.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Super-admin da Niflow monitorando instâncias e entrando num tenant para dar suporte.

### 2.2 Fluxo do usuário

Backoffice → lista de tenants (status, uso, WhatsApp) → ajusta status/limite → "impersonar" → opera dentro do tenant com aviso visível → "parar impersonação".

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Backoffice.tsx` (rota `/admin`).

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Table/Badge/Banner | sim | aviso de impersonation |

### 2.5 Estados e edge cases

- Usuário não super-admin: rota bloqueada (`requireSuperAdmin`).
- Impersonando: banner de aviso; toda ação sob o tenant impersonado, auditada.
- Instância WhatsApp desconectada: destacada no monitor.

### 2.6 Critérios de aceite (visão UX)

- [x] Aviso claro durante impersonation.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; policy própria de super-admin + auditoria.

### 3.2 Arquitetura

- Rota: `apps/api/src/routes/backoffice.ts` (overview, status/limit, impersonate, audit).
- Schema/RPC: `audit_log` (`20260701000000_saas_core.sql`); `registrar_auditoria`, `impersonar_tenant`, `parar_impersonacao` (`20260702000000_finalizacoes.sql`); `custom_access_token_hook` (super-admin claim).
- Middleware: `requireSuperAdmin` (`middleware/auth.ts`); `/auth/me` expõe `impersonating` (`routes/auth.ts`).

### 3.3 Decisões técnicas

Cruzar tenants só via policy super-admin auditada ([ADR-0001](../adr/adr-0001-isolamento-multitenant-rls.md), [ADR-0011](../adr/adr-0011-defesa-em-profundidade-jwt-ssrf.md)).

### 3.4 Estimativa de complexidade

Média/Alta — cruzamento de tenants controlado + auditoria.

### 3.5 Critérios de aceite (visão Tech)

- [x] Só super-admin cruza tenants; tudo auditado.
- [x] Impersonation reversível e sinalizada.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Back-office de tenants (overview, status/limite), monitor de WhatsApp, impersonation auditada com aviso, leitura de auditoria.

### 4.2 Desvios do planejado

Nenhum estrutural.

### 4.3 Validação (QA)

- [x] Seed com super-admin de plataforma (`admin@eradigital.test`).
- [x] Impersonation registrada em `audit_log`.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

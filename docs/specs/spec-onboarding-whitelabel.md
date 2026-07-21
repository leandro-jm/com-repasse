---
type: spec
issue_type: feature
category: feature
status: done
domain: onboarding
owner: Produto (Niflow)
branch: feat/onboarding-whitelabel
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [ONBOARDING] Onboarding e white-label por tenant

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

Um novo lojista (ou revenda white-label) precisa entrar, criar seu tenant e começar a usar sem fricção, com a cara da sua marca (cor/logo). Sem onboarding e white-label, cada ativação vira trabalho manual e o produto não é revendável.

### 1.2 Objetivo

Permitir que um usuário sem tenant crie o seu (trial), e que cada tenant personalize a identidade visual (white-label), tornando o produto revendável.

### 1.3 Contexto de negócio

Módulo 12 (PRD §12, roadmap Fase 1/2). Depende de [spec-tenants-iam-rbac](spec-tenants-iam-rbac.md) e da stack de front white-label ([ADR-0012](../adr/adr-0012-stack-frontend-react-vite.md)).

### 1.4 Regras de negócio

- RN-01: usuário sem associação de tenant é levado ao onboarding para criar o primeiro (`criar_tenant` cria tenant + membership owner + trial de 14 dias).
- RN-02: cada tenant tem `cor_primaria`/`logo_url`; o front aplica tema dinâmico (dark/light).
- RN-03: white-label é entitlement de plano (`planos.white_label`).

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Ativação | tenants criados ÷ signups | alta | — | baixa |
| Tempo ao primeiro carro | signup → 1º negócio | curto | — | longo |

### 1.6 Escopo

ENTRA: criação de tenant no primeiro acesso (trial), tema por tenant (cor/logo), entitlement de white-label.
NÃO ENTRA: domínio customizado por tenant (subdomínio vs. domínio próprio — decisão em aberto, PRD §14).

### 1.7 Stakeholders

- Quem pediu: plataforma/comercial. Quem valida: Produto. Quem usa: novo Owner.

### 1.8 Critérios de aceite (visão PM)

- [x] Usuário novo cria o próprio tenant (trial).
- [x] Cor/logo do tenant aplicadas no app.

### 1.9 Questões em aberto (clarify)

Estratégia de white-label por domínio (subdomínio vs. custom) fica como follow-up (PRD §14).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Lojista novo se cadastrando; revenda configurando a marca.

### 2.2 Fluxo do usuário

Signup → sem tenant → onboarding cria tenant (trial) → Config define cor/logo → app já com a marca.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Onboarding.tsx`, `apps/web/src/pages/Config.tsx`; tema em `apps/web/src/providers/theme.tsx`; landing/marketing em `apps/web/src/components/landing/`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Form/Card/ColorPicker | sim | tema por tenant |

### 2.5 Estados e edge cases

- Usuário com vários tenants: escolhe/troca (não cai no onboarding).
- Tenant sem tenant ativo: `RequireTenant` redireciona para `/admin`/onboarding.
- White-label desabilitado no plano: usa tema padrão.

### 2.6 Critérios de aceite (visão UX)

- [x] Onboarding sem fricção; marca aplicada.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; tema dinâmico por token.

### 3.2 Arquitetura

- Rotas: `apps/api/src/routes/tenants.ts` (criar/config); `criar_tenant` (`20260701000200_rls_and_auth.sql`).
- Front: `providers/session.tsx` (resolve tenant ativo, fallback/onboarding), `providers/theme.tsx` (cor/logo), `App.tsx` (`RequireTenant`, rota `OnboardingPage`).
- Entitlement: `planos.white_label` (`20260701000000_saas_core.sql`).

### 3.3 Decisões técnicas

Front white-label sem rebuild (bundle agnóstico de domínio, [ADR-0012](../adr/adr-0012-stack-frontend-react-vite.md), [ADR-0008](../adr/adr-0008-hospedagem-docker-portainer.md)).

### 3.4 Estimativa de complexidade

Média — provisionamento de tenant + tema dinâmico + roteamento condicional.

### 3.5 Critérios de aceite (visão Tech)

- [x] `criar_tenant` cria tenant + owner + trial atômico.
- [x] Tema aplicado por tenant sem rebuild.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Onboarding que cria o primeiro tenant (trial 14 dias), tema por tenant (cor/logo, dark/light), entitlement de white-label por plano, roteamento condicional para usuário sem tenant.

### 4.2 Desvios do planejado

Domínio customizado por tenant ainda não implementado (decisão em aberto).

### 4.3 Validação (QA)

- [x] Signup sem tenant cai no onboarding e cria tenant.
- [x] Cor primária do tenant reflete no app.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

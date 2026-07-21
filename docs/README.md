# Documentação — CRM de Repasse de Veículos

Documentação no padrão **SDD** (Spec-Driven Development). Três tipos de artefato:

- **ADR** (`docs/adr/`) — decisões estruturais. Uma decisão por arquivo.
- **Spec** (`docs/specs/`) — uma por módulo/entrega, no formato fase+gate.
- **Épico** (`docs/plans/`) — guarda-chuva que agrega e sequencia as specs.

Os templates estão em [`docs/templates/`](templates/). O contrato para agentes de IA está em [`../AGENTS.md`](../AGENTS.md).

> As specs aqui são **as-built (retrospectivas)**: reconstruídas do código existente em 2026-07-17 para documentar o que já foi entregue. O aceite formal do dono do domínio de cada uma está pendente. Trabalho novo daqui pra frente deve seguir o fluxo normal (discovery → design → tech → implementação).

## Épico

- [plan-crm-repasse-saas](plans/plan-crm-repasse-saas.md) — `doing` — SaaS multi-tenant, 12 entregas mapeadas nas fases do roadmap.

## ADRs

| ID | Decisão | Status |
|---|---|---|
| [ADR-0001](adr/adr-0001-isolamento-multitenant-rls.md) | Isolamento multi-tenant por RLS (`tenant_id` por linha, claim no JWT) | aceita |
| [ADR-0002](adr/adr-0002-arquitetura-tres-camadas-api.md) | 3 camadas: front → API (Hono) → Supabase | aceita |
| [ADR-0003](adr/adr-0003-iam-supabase-auth-jwt-hook.md) | IAM: Supabase Auth + claims via `custom_access_token_hook` | aceita |
| [ADR-0004](adr/adr-0004-provider-whatsapp-por-tenant.md) | Abstração de provider WhatsApp, instância por tenant | aceita |
| [ADR-0005](adr/adr-0005-segredos-cifrados-por-tenant.md) | Segredos por tenant cifrados em repouso (AES-256-GCM) | aceita |
| [ADR-0006](adr/adr-0006-worker-campanhas-metering-atomico.md) | Worker assíncrono de campanhas + metering atômico | aceita |
| [ADR-0007](adr/adr-0007-calculo-no-banco-generated-views-rpc.md) | Cálculo no banco: colunas `GENERATED`, views, RPCs | aceita |
| [ADR-0008](adr/adr-0008-hospedagem-docker-portainer.md) | Hospedagem: Docker + Portainer, web proxy same-origin | aceita |
| [ADR-0009](adr/adr-0009-monorepo-pnpm-shared.md) | Monorepo pnpm; `packages/shared` como fonte única | aceita |
| [ADR-0010](adr/adr-0010-billing-abstraido.md) | Billing abstraído (`BillingProvider`, manual hoje) | aceita |
| [ADR-0011](adr/adr-0011-defesa-em-profundidade-jwt-ssrf.md) | Defesa em profundidade: JWT server-side + guarda SSRF | aceita |
| [ADR-0012](adr/adr-0012-stack-frontend-react-vite.md) | Stack de frontend: React+Vite+TS, mobile-first, white-label | aceita |

## Specs

| Domínio | Spec | Status |
|---|---|---|
| tenants | [spec-tenants-iam-rbac](specs/spec-tenants-iam-rbac.md) | done |
| negocios | [spec-negocios-gestao-carros](specs/spec-negocios-gestao-carros.md) | done |
| contatos | [spec-contatos-base-optin](specs/spec-contatos-base-optin.md) | done |
| campanhas | [spec-campanhas-whatsapp](specs/spec-campanhas-whatsapp.md) | done |
| financeiro | [spec-financeiro-dre](specs/spec-financeiro-dre.md) | done |
| captacao | [spec-captacao-roi-canal](specs/spec-captacao-roi-canal.md) | done |
| custos | [spec-custos-centros](specs/spec-custos-centros.md) | done |
| acordos | [spec-acordos-juridico](specs/spec-acordos-juridico.md) | done |
| contratos | [spec-contratos-pdf](specs/spec-contratos-pdf.md) | done |
| planos | [spec-planos-assinaturas](specs/spec-planos-assinaturas.md) | done |
| backoffice | [spec-backoffice-superadmin](specs/spec-backoffice-superadmin.md) | done |
| onboarding | [spec-onboarding-whitelabel](specs/spec-onboarding-whitelabel.md) | done |

## Como criar um documento novo

1. **Nova feature** → copie [`templates/spec-feature.md`](templates/spec-feature.md) para `specs/spec-<dominio>-<slug>.md`, `status: discovery`, e preencha fase a fase.
2. **Correção** → copie [`templates/spec-fix.md`](templates/spec-fix.md).
3. **Decisão estrutural** → copie [`templates/adr.md`](templates/adr.md) para `adr/adr-00NN-<slug>.md` (id sequencial) e atualize a tabela acima.
4. **Épico** → copie [`templates/plan-epic.md`](templates/plan-epic.md) para `plans/plan-<slug>.md`.

Convenção de nomes: `spec-<dominio>-<slug>.md`, `adr-00NN-<slug>.md`, `plan-<slug>.md` (tudo kebab-case).

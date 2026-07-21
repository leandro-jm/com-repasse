---
type: epic
status: doing
owner: Produto (Niflow)
created: 2026-07-17
updated: 2026-07-17
---

> **Épico as-built (retrospectivo).** Guarda-chuva que organiza as 12 entregas do produto já implementadas, mapeadas nas fases do roadmap (PRD §12). Serve de índice navegável.

# [EPIC] CRM de Repasse de Veículos — SaaS multi-tenant

## Objetivo

Entregar um CRM SaaS multi-tenant para lojistas de repasse de veículos que substitui a planilha, resolve a distribuição de "carro novo" no WhatsApp e organiza os números da operação — revendável como produto (Niflow), começando pelo piloto Carvalho Júnior.

## Contexto

Duas dores validadas (PRD §1): (1) distribuição no WhatsApp (lista bloqueada, grupos ignorados) e (2) organização (CRM/financeiro). O produto nasceu para o Carvalho Júnior e foi generalizado para SaaS. As decisões estruturais estão nos ADRs em [`docs/adr/`](../adr/); cada módulo tem sua spec em [`docs/specs/`](../specs/).

## Escopo do épico

ENTRA:
- Fundação SaaS (multi-tenancy, IAM/RBAC, RLS) e as 8 áreas de CRM + 4 de plataforma.
- Motor de campanhas WhatsApp com provider por tenant.

NÃO ENTRA (follow-ups, PRD §14):
- Gateway de billing BR definitivo (Asaas/Iugu/Pagar.me).
- White-label por domínio customizado.
- Migração ampla para WhatsApp Cloud API (WABA por tenant) — Fase 5.

## Decomposição em entregas

Cada entrega tem spec própria em [`docs/specs/`](../specs/).

| Entrega | Classe | Depende de | Status |
|---|---|---|---|
| [spec-tenants-iam-rbac](../specs/spec-tenants-iam-rbac.md) | feature | — | done |
| [spec-negocios-gestao-carros](../specs/spec-negocios-gestao-carros.md) | feature | tenants | done |
| [spec-contatos-base-optin](../specs/spec-contatos-base-optin.md) | feature | tenants | done |
| [spec-campanhas-whatsapp](../specs/spec-campanhas-whatsapp.md) | feature | contatos, negocios | done |
| [spec-onboarding-whitelabel](../specs/spec-onboarding-whitelabel.md) | feature | tenants | done |
| [spec-planos-assinaturas](../specs/spec-planos-assinaturas.md) | feature | tenants | done |
| [spec-backoffice-superadmin](../specs/spec-backoffice-superadmin.md) | feature | tenants | done |
| [spec-financeiro-dre](../specs/spec-financeiro-dre.md) | feature | negocios, custos, acordos | done |
| [spec-captacao-roi-canal](../specs/spec-captacao-roi-canal.md) | feature | negocios | done |
| [spec-custos-centros](../specs/spec-custos-centros.md) | feature | tenants | done |
| [spec-acordos-juridico](../specs/spec-acordos-juridico.md) | feature | tenants | done |
| [spec-contratos-pdf](../specs/spec-contratos-pdf.md) | feature | negocios | done |

## Sequência e dependências

Ordem de ataque mapeada nas fases do roadmap (PRD §12):

- **Fase 0 — Fundação SaaS**: `spec-tenants-iam-rbac` (multi-tenancy + RLS + IAM/JWT) + infra ([ADR-0008](../adr/adr-0008-hospedagem-docker-portainer.md)). Bloqueia todo o resto.
- **Fase 1 — MVP** (piloto Carvalho Júnior): `spec-negocios-gestao-carros`, `spec-contatos-base-optin`, `spec-campanhas-whatsapp`, `spec-onboarding-whitelabel` (básico).
- **Fase 2 — Camada comercial**: `spec-planos-assinaturas`, `spec-backoffice-superadmin`, `spec-onboarding-whitelabel` (white-label).
- **Fase 3 — Financeiro**: `spec-financeiro-dre`, `spec-custos-centros`, `spec-captacao-roi-canal`.
- **Fase 4 — Jurídico + contratos**: `spec-acordos-juridico`, `spec-contratos-pdf`.
- **Fase 5 — Escala WhatsApp**: migração para Cloud API oficial (provider já implementado; onboarding de WABA por tenant pendente) — evolui `spec-campanhas-whatsapp`.

## Status agregado

12 de 12 entregas implementadas (registro as-built). Gargalos/follow-ups abertos: gateway de billing (Fase 2), white-label por domínio (Fase 2), migração para WhatsApp Cloud API em escala (Fase 5), e a **remoção do segredo vazado em `supabase/supabase.txt`** (rotacionar chave). Ver ADRs em [`docs/adr/`](../adr/) e o [índice de docs](../README.md).

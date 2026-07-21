---
type: adr
id: ADR-0012
status: aceita
domain: frontend
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-onboarding-whitelabel, spec-negocios-gestao-carros]
---

# ADR-0012 — Stack de frontend: React + Vite + TS, mobile-first, white-label

## Contexto

O operador (ex.: Daniel) usa o CRM majoritariamente no celular, em movimento (cadastra carro, dispara campanha, fecha negócio). O produto é white-label: cada tenant tem sua cor primária/logo, e a plataforma é revendável. Precisamos de uma stack produtiva, com tema dinâmico por tenant e sem servidor de renderização (o front é um SPA servido por nginx, [ADR-0008](adr-0008-hospedagem-docker-portainer.md)).

## Decisão

**React + TypeScript (Vite), mobile-first, Tailwind + shadcn/ui, tema dinâmico por tenant.**

- Vite `^6` + React `^18`; router `react-router-dom`, dados com `@tanstack/react-query`, formulários com `react-hook-form` + resolvers Zod (schemas de `@crm/shared`), gráficos com `recharts`.
- **White-label**: `providers/theme.tsx` aplica `cor_primaria`/`logo_url` do tenant (dark/light); `providers/session.tsx` resolve tenant ativo (com impersonation) e orquestra o refresh de JWT na troca de tenant ([ADR-0003](adr-0003-iam-supabase-auth-jwt-hook.md)).
- **Cliente único** `lib/api.ts` — a única superfície de rede do front, tipada, com refresh single-flight ([ADR-0002](adr-0002-arquitetura-tres-camadas-api.md)).
- Build agnóstico de domínio (`VITE_API_URL=/api`) → mesmo bundle para todos os tenants/domínios.

## Alternativas consideradas

- **Next.js / SSR** — SEO/SSR não são requisito (app autenticado); SSR adicionaria um runtime Node a servir o front, contra o modelo nginx-SPA. A página pública de carro é uma rota simples, não justifica SSR.
- **CSS-in-JS / outra lib de UI** — Tailwind + shadcn dá velocidade e tema por token (cor primária) sem runtime extra.
- **Estado global manual (Redux)** — react-query cobre o server-state; contexto cobre sessão/tema. Sem necessidade.

## Consequências

### Positivas

- Mobile-first alinhado ao uso real do operador.
- Tema por tenant sem rebuild (white-label de verdade).
- SPA estático servível por nginx, sem runtime de front.

### Negativas · trade-offs

- Sem SSR → a página pública de carro depende de client render (aceitável; sem PII, sem SEO crítico).
- `@tanstack/react-query` + `react-hook-form` + `recharts` são dependências a manter atualizadas.
- Tema dinâmico exige disciplina: nada de hex cru nos componentes — só tokens do tema.

## Referências

- PRD `PRD_CRM_Carvalho_Junior.md §7.3`
- `apps/web/vite.config.ts`, `apps/web/src/providers/{session,theme}.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/pages/`
- Specs: `docs/specs/spec-onboarding-whitelabel.md`

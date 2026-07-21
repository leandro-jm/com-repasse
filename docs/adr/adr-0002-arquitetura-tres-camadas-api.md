---
type: adr
id: ADR-0002
status: aceita
domain: arquitetura
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-tenants-iam-rbac, spec-negocios-gestao-carros]
---

# ADR-0002 — Arquitetura de 3 camadas: front → API (Hono) → Supabase

## Contexto

O PRD (§7.3) descrevia originalmente um modelo mais direto (Supabase como backend, front falando com Supabase). Ao evoluir, decidimos interpor uma camada de API própria. Motivos: precisamos de lógica de servidor que o cliente não pode ver nem executar (proxy de auth, criptografia de segredos de WhatsApp, chamadas de saída ao Evolution com guarda SSRF, geração de PDF, reserva atômica de envios, webhooks de billing). Deixar isso no front exporia service-role keys e segredos de tenant no browser.

## Decisão

**3 camadas: `apps/web` (React) → `apps/api` (Hono) → Supabase. O frontend nunca fala com o Supabase diretamente** — nem auth, nem dados, nem storage. Tudo passa pela API.

- O front só conhece `VITE_API_URL`; em produção é `/api` (mesma origem, sem CORS).
- O único cliente de rede do front é `apps/web/src/lib/api.ts` (tipado, espelhando cada grupo de rota, com refresh de token single-flight).
- Cada requisição autenticada cria um cliente Supabase **com o JWT do usuário** (`apps/api/src/supabase.ts` → `userClient`), então a RLS ([ADR-0001](adr-0001-isolamento-multitenant-rls.md)) continua valendo como rede de segurança. O `adminClient()` (service-role, bypassa RLS) só é usado em operações privilegiadas específicas (criar usuários de auth, worker).

## Alternativas consideradas

- **Front → Supabase direto (modelo original do PRD §7.3)** — simples, mas exporia chaves/segredos e impossibilitaria a lógica de servidor (cripto, SSRF, metering atômico). Descartado.
- **BFF por app / múltiplos backends** — overkill para o tamanho atual; um Hono monolítico modular basta.

## Consequências

### Positivas

- Segredos (WhatsApp `api_key`, service-role) nunca chegam ao browser.
- Ponto único para autorização por papel, validação de schema (Zod compartilhado) e guardas de segurança.
- Em produção, nginx faz proxy `/api` same-origin → sem CORS.

### Negativas · trade-offs

- Uma camada a mais para manter e implantar (serviço `api` no Docker).
- A API precisa reintroduzir o contexto de tenant em cada request (via JWT), em vez de o cliente Supabase resolver sozinho.
- Duplicação aparente (schemas no front e na API) — mitigada por `packages/shared` como fonte única ([ADR-0009](adr-0009-monorepo-pnpm-shared.md)).

## Referências

- `README.md` (nota de arquitetura), `.env.example` (topo)
- `apps/api/src/index.ts` (montagem de rotas), `apps/api/src/supabase.ts` (`userClient`/`anonClient`/`adminClient`)
- `apps/web/src/lib/api.ts` (cliente único)
- Specs: `docs/specs/spec-negocios-gestao-carros.md`

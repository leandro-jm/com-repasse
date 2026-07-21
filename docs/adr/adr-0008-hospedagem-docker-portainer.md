---
type: adr
id: ADR-0008
status: aceita
domain: infra
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-onboarding-whitelabel]
---

# ADR-0008 — Hospedagem: Docker + Portainer, web como proxy same-origin

## Contexto

Precisamos de um deploy simples e barato para VPS, com os três serviços do produto (web, api, worker) e sem expor a API diretamente à internet. Além disso, queremos evitar CORS em produção e manter o bundle do front agnóstico de domínio (white-label / múltiplos domínios de tenant).

## Decisão

**VPS + Docker + Portainer, imagens no Docker Hub (registry `niflow`). Stack de 3 serviços:**

- **web** — nginx serve o SPA **e faz reverse-proxy `/api/*` → `api:8787`** (mesma origem, **sem CORS**). Publica `${WEB_PORT:-8080}:80`, healthcheck `/healthz`.
- **api** — Hono na 8787, **sem porta pública** (só alcançável via proxy do web).
- **worker** — sender de campanhas ([ADR-0006](adr-0006-worker-campanhas-metering-atomico.md)).

Detalhes: build do web com `VITE_API_URL=/api` (bundle agnóstico de domínio); `nginx.default.conf.template` usa resolver `127.0.0.11` (re-resolve upstream), `client_max_body_size 25m`, SPA fallback. Evolution API é **externo** (nunca neste compose — conexão é por tenant, [ADR-0004](adr-0004-provider-whatsapp-por-tenant.md)). Migrations/seed **não** são embutidas nas imagens — aplicadas via Supabase CLI (`supabase link` + `db push`).

## Alternativas consideradas

- **PaaS gerenciado (Vercel/Render/Fly)** — menos ops, mas menos controle e custo variável; a VPS + Portainer dá controle e previsibilidade pro estágio atual.
- **Kubernetes** — overkill pro tamanho; 3 serviços não justificam.
- **API exposta publicamente + CORS** — superfície de ataque maior e CORS pra manter. Rejeitado — proxy same-origin é mais simples e seguro.

## Consequências

### Positivas

- Sem CORS em produção (same-origin); API não exposta.
- Bundle do front agnóstico de domínio → suporta white-label / múltiplos domínios.
- Deploy reproduzível via Portainer + Docker Hub.

### Negativas · trade-offs

- Ops manual da VPS (patch, backup, monitoramento) — sem o "gerenciado" de um PaaS.
- Migrations aplicadas fora da imagem exigem passo separado no deploy (disciplina).
- Escala horizontal do worker/api precisa ser pensada quando o volume crescer.

## Referências

- `infra/README.md`, `infra/docker-compose.yml`, `infra/docker-compose.build.yml`, `infra/build-push.sh`
- `apps/web/Dockerfile`, `apps/web/nginx.default.conf.template`, `apps/api/Dockerfile`, `apps/worker/Dockerfile`
- PRD `PRD_CRM_Carvalho_Junior.md §7.6`

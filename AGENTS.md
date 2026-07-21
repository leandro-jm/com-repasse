# AGENTS.md — CRM de Repasse de Veículos

Contrato para agentes de IA (e humanos novos) que trabalham neste repositório. Leia antes de mexer no código. Para o detalhe de arquitetura, veja os ADRs em [`docs/adr/`](docs/adr/); para o comportamento de cada módulo, as specs em [`docs/specs/`](docs/specs/).

## O que é

SaaS **multi-tenant** B2B para lojistas de **repasse de veículos** (revenda rápida B2B). Cada lojista é um **tenant** isolado, com seus dados, seu número de WhatsApp e sua assinatura. Distribuído pela **Niflow**; tenant piloto: Carvalho Júnior. Duas dores centrais: distribuição de "carro novo" no WhatsApp e organização CRM/financeira. Fonte de produto: [`PRD_CRM_Carvalho_Junior.md`](PRD_CRM_Carvalho_Junior.md).

## Layout do monorepo (pnpm workspaces)

- `apps/web` — SPA React + Vite + TS + Tailwind/shadcn (mobile-first, white-label). ([ADR-0012](docs/adr/adr-0012-stack-frontend-react-vite.md))
- `apps/api` — backend **Hono** (auth proxy, REST por módulo, cripto, PDF, SSRF, billing). ([ADR-0002](docs/adr/adr-0002-arquitetura-tres-camadas-api.md))
- `apps/worker` — sender de campanhas WhatsApp (polling, throttle, idempotente). ([ADR-0006](docs/adr/adr-0006-worker-campanhas-metering-atomico.md))
- `packages/shared` (`@crm/shared`) — **fonte única** de tipos, schemas Zod, regras de negócio, cripto, templates. ([ADR-0009](docs/adr/adr-0009-monorepo-pnpm-shared.md))
- `supabase/` — migrations, RLS, views/RPC, seed.
- `infra/` — Docker + Portainer. ([ADR-0008](docs/adr/adr-0008-hospedagem-docker-portainer.md))

## Regras de ouro (invioláveis)

1. **O front nunca fala com o Supabase direto.** Nem auth, nem dados, nem storage — **tudo passa pela API** (`apps/api`). O único cliente de rede do front é `apps/web/src/lib/api.ts`. ([ADR-0002](docs/adr/adr-0002-arquitetura-tres-camadas-api.md))
2. **Isolamento por RLS + `tenant_id` em cada linha.** O `tenant_id`/`papel` vêm como claim no JWT (via `custom_access_token_hook`). "Falta filtro `tenant_id`" quase nunca é bug — a RLS filtra. Nunca use `adminClient()` (service-role) para contornar isolamento. ([ADR-0001](docs/adr/adr-0001-isolamento-multitenant-rls.md), [ADR-0003](docs/adr/adr-0003-iam-supabase-auth-jwt-hook.md))
3. **Config do WhatsApp (Evolution) é por tenant**, em `whatsapp_instances` — **nunca em env**. O `api_key` é **cifrado em repouso** (AES-256-GCM) e **nunca volta ao browser**. ([ADR-0004](docs/adr/adr-0004-provider-whatsapp-por-tenant.md), [ADR-0005](docs/adr/adr-0005-segredos-cifrados-por-tenant.md))
4. **Regras de negócio (RB1–RB8) moram em `packages/shared/src/regras.ts`** e são espelho dos cálculos do banco (colunas `GENERATED`, views, RPCs). Não reimplemente fórmula solta — reuse. ([ADR-0007](docs/adr/adr-0007-calculo-no-banco-generated-views-rpc.md))
5. **Schemas de validação (Zod) são compartilhados** (`packages/shared/src/schemas.ts`) entre front e API. Uma definição, dois consumidores.
6. **Metering de envios é reservado no enqueue** (`reservar_envios`/`liberar_envios`), não no worker — não conte envio duas vezes. ([ADR-0006](docs/adr/adr-0006-worker-campanhas-metering-atomico.md))
7. **Toda chamada de saída ao Evolution passa pela guarda SSRF** (`apps/api/src/ssrf.ts`); o JWT é validado server-side (`db.auth.getUser()`). ([ADR-0011](docs/adr/adr-0011-defesa-em-profundidade-jwt-ssrf.md))
8. **O alvo é o Supabase Cloud** do `.env`. Migre com `supabase db push` (não `db:reset` no cloud).

## Como rodar

```bash
pnpm install
# Banco: Supabase Cloud (via .env) — supabase link + supabase db push
pnpm db:types          # regenera packages/shared/src/database.types.ts após migration
pnpm api               # Hono na :8787
pnpm dev               # web (Vite) na :5180
pnpm worker            # sender de campanhas
pnpm test              # vitest (regras, schemas, contrato)
```

Variáveis: ver [`.env.example`](.env.example). `APP_ENCRYPTION_KEY` é **obrigatória em produção** (a API não boota sem ela).

## Papéis (RBAC)

Dentro do tenant: `owner`, `admin`, `operador`, `financeiro`, `viewer`. Plataforma: **super-admin** (Niflow) — cruza tenants só via policy própria **auditada** (impersonation registrada em `audit_log`). ([spec-backoffice-superadmin](docs/specs/spec-backoffice-superadmin.md))

## Fluxo de documentação (SDD)

- **ADR** = uma decisão estrutural por arquivo, em [`docs/adr/`](docs/adr/). Decisão revista não se edita no lugar — cria-se novo ADR (`supersedes`/`superseded_by`).
- **Spec** = uma por módulo, formato fase+gate, em [`docs/specs/`](docs/specs/). As atuais são **as-built** (retrospectivas, `status: done`) — trabalho novo segue o pipeline completo (discovery → design → tech → implementação).
- **Épico** = guarda-chuva em [`docs/plans/`](docs/plans/).
- Templates em [`docs/templates/`](docs/templates/). Índice em [`docs/README.md`](docs/README.md).

Convenção: `spec-<dominio>-<slug>.md`, `adr-00NN-<slug>.md`, `plan-<slug>.md`. Trabalho novo em branch `feat/<slug>` ou `fix/<slug>`; `main` é protegida (chega por PR).

## Segurança — pendências conhecidas

- **`supabase/supabase.txt` está no repositório com credenciais reais** (URL + chave + string tipo senha). Isso é um **segredo vazado**: remover do git e **rotacionar** a chave. Nunca commitar segredo — use `.env` (fora do git).
- Auditoria de impersonation e dados de contato precisam de retenção/DPA conforme LGPD (o tenant é controlador; a plataforma, operadora).

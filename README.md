# CRM de Repasse de Veículos — SaaS multi-tenant

Plataforma SaaS (B2B) para repassadores de veículos: gestão de negócios/carros, base de
contatos e **motor de campanhas WhatsApp por tenant**, além da camada SaaS (planos,
limites, back-office, white-label) e módulos financeiro/jurídico/contratos.

Cliente-piloto: **Carvalho Júnior** (tenant 0). Ver [PRD](./PRD_CRM_Carvalho_Junior.md) e o
plano de implementação em `~/.claude/plans/`.

## Arquitetura

**3 camadas: front → backend → Supabase.** O frontend **nunca** fala com o Supabase
diretamente (nem auth, nem dados, nem storage) — tudo passa pela API.

- **Backend API (Hono)** — proxy de auth (GoTrue), rotas REST por módulo e upload de fotos.
  Em cada requisição autenticada cria um client Supabase **com o JWT do usuário**, então a
  **RLS** continua valendo como rede de segurança.
- **Isolamento multi-tenant no banco (RLS)** — cada linha tem `tenant_id`; policies filtram
  pelo claim `tenant_id` do JWT. Isolamento imposto no Postgres, não na aplicação.
- **Supabase Cloud** — Postgres + Auth + Storage + RLS.
- **WhatsApp** — Evolution API. A conexão (URL/key/instância) é **por tenant**, guardada em
  `whatsapp_instances` (configurada no admin do tenant), nunca em env.

## Estrutura (monorepo pnpm)

```
apps/web        # React + Vite + TS + Tailwind (mobile-first, dark/light) — só fala com a API
apps/api        # Backend Hono: auth + REST + storage; encaminha o JWT p/ o Supabase (RLS)
apps/worker     # Node/TS: consome campanha_envios, envia com throttling, faz metering
packages/shared # tipos do banco, zod schemas, regras de negócio (RB1–RB9)
supabase/       # migrations (schema + RLS + views/RPC) e seed
infra/          # docker-compose (api + worker); Evolution API é externo/existente
```

## Setup

```bash
pnpm install
cp .env.example .env             # backend: SUPABASE_URL/ANON_KEY, WEB_ORIGIN, etc.
# apps/web/.env → VITE_API_URL=http://localhost:8787

supabase start                   # ou Supabase Cloud + supabase link
pnpm db:reset                    # aplica migrations + seed
pnpm db:types                    # gera tipos TS em packages/shared/src/database.types.ts

pnpm api                         # backend (porta 8787) — precisa das envs SUPABASE_*
pnpm dev                         # app web (porta 5173)
pnpm worker                      # worker de campanhas
```

---
type: adr
id: ADR-0009
status: aceita
domain: arquitetura
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-negocios-gestao-carros, spec-financeiro-dre]
---

# ADR-0009 — Monorepo pnpm workspaces; `packages/shared` como fonte única

## Contexto

Front (React), API (Hono) e worker (Node) compartilham conceitos: os tipos do banco, os schemas de validação (Zod), as regras de negócio (RB1–RB8), os templates de WhatsApp/contrato e a criptografia de segredos. Duplicar isso entre três apps garante divergência (um valida diferente do outro, uma fórmula desatualiza).

## Decisão

**Monorepo pnpm workspaces** (`pnpm-workspace.yaml` com `apps/*` e `packages/*`), com **`packages/shared` (`@crm/shared`) como fonte única** de:

- `database.types.ts` — tipos gerados do Supabase (`pnpm db:types`).
- `schemas.ts` — schemas Zod compartilhados entre front e API (`whatsappUpsertSchema`, `acordoSchema`, `contratoGerarSchema`, ...).
- `regras.ts` — RB1–RB8 como funções puras (espelho do banco, [ADR-0007](adr-0007-calculo-no-banco-generated-views-rpc.md)).
- `cripto.ts` — AES-256-GCM ([ADR-0005](adr-0005-segredos-cifrados-por-tenant.md)).
- `whatsapp.ts` / `contrato.ts` — templates e montagem de mensagem/contrato.
- `constants.ts` — limites (`MAX_FOTOS_POR_NEGOCIO=15`, `MAX_ANEXO_BYTES=5MB`, ...).

`@crm/shared` é consumido **como source** (sem build step; `main`/`types` apontam pra `src/`), via protocolo workspace. Toolchain comum em `tsconfig.base.json` (ES2022, strict, `verbatimModuleSyntax`), Prettier na raiz, testes com Vitest.

## Alternativas consideradas

- **Repos separados + pacote publicado** — versionamento e release overhead entre repos; lento pra um time pequeno. Rejeitado.
- **Copiar código entre apps** — divergência garantida. Rejeitado.
- **Nx/Turborepo** — orquestração mais rica, mas peso desnecessário; scripts pnpm na raiz bastam.

## Consequências

### Positivas

- Uma definição de tipo/schema/regra para os três apps — sem divergência.
- `@crm/shared` como source evita passo de build e mantém DX rápido.
- Mudança de contrato propaga por typecheck em todos os consumidores.

### Negativas · trade-offs

- `@crm/shared` mistura código node-only (`cripto.ts`) e isomórfico — consumidores precisam saber o que podem importar no browser.
- Consumir source (sem build) acopla os apps à estrutura interna do pacote.
- Regenerar `database.types.ts` é um passo manual (`pnpm db:types`) após migration.

## Referências

- `pnpm-workspace.yaml`, `package.json` (scripts raiz), `tsconfig.base.json`
- `packages/shared/src/{index,regras,schemas,cripto,whatsapp,contrato,constants,database.types}.ts`
- Specs: `docs/specs/spec-financeiro-dre.md`

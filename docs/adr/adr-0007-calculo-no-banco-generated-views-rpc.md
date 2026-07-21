---
type: adr
id: ADR-0007
status: aceita
domain: dados
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-financeiro-dre, spec-negocios-gestao-carros, spec-captacao-roi-canal, spec-acordos-juridico]
---

# ADR-0007 — Cálculo no banco: colunas `GENERATED`, views `security_invoker` e RPCs

## Contexto

O produto vive de números: lucro por negócio (RB1), saldo de acordo (RB4), DRE anual (RB3), ROI por canal (RB6). Esses valores são lidos em vários lugares (dashboard, formulários, listas). Recalcular no cliente arriscaria divergência entre telas e entre front/worker, e agregações no cliente seriam lentas e furariam a RLS.

## Decisão

**Cálculo derivado mora no banco, respeitando a RLS:**

- **Colunas `GENERATED`**: `negocios.lucro` é coluna gerada (RB1). `acordos.saldo` é mantido por trigger `recalc_saldo_acordo` (RB4).
- **Views `security_invoker=true`**: `vw_negocios_mensal`, `vw_custos_mensal` — agregam por período/tenant respeitando a RLS de quem consulta.
- **RPCs**: `dre_anual(p_ano)` (RB3), `roi_por_canal` (RB6/RF5), `envios_restantes`, `pode_disparar`, `registrar_envios`/`reservar_envios`/`liberar_envios` (metering), `carro_publico`/`optout_contato` (público).
- **Espelho no cliente**: `packages/shared/src/regras.ts` reimplementa RB1–RB8 como funções puras **apenas para previews/formulários** — a fonte de verdade é o banco. Os testes (`regras.test.ts`) garantem que os dois batem.

## Alternativas consideradas

- **Calcular tudo na aplicação/cliente** — divergência entre telas, agregação lenta, fura RLS. Rejeitado como fonte de verdade.
- **Materialized views** — ganho de performance, mas complexidade de refresh; adiar até haver volume que justifique.
- **Views `security_definer`** — bypassariam a RLS do consultante; usamos `security_invoker` de propósito, exceto RPCs public que precisam expor só campos seguros (`carro_publico` é `security definer` e devolve apenas dados não-PII).

## Consequências

### Positivas

- Um número, uma definição — sem divergência entre front, worker e relatórios.
- Agregações rápidas e sob RLS.
- Regras versionadas junto com o schema (migrations = histórico das fórmulas).

### Negativas · trade-offs

- Mudar uma fórmula exige migration + atualizar o espelho em `regras.ts` (dois lugares, cobertos por teste).
- Lógica de negócio em SQL exige quem saiba ler/manter PL/pgSQL.
- Views `security_invoker` dependem de a RLS estar correta (acoplamento com [ADR-0001](adr-0001-isolamento-multitenant-rls.md)).

## Referências

- PRD `PRD_CRM_Carvalho_Junior.md §6`, regras RB1–RB6 (§8)
- `supabase/migrations/20260701000100_crm_core.sql`, `20260701000300_views_rpc.sql`, `20260707000000_dre_custos_operacionais.sql`, `20260715000100_dre_acordos.sql`
- `packages/shared/src/regras.ts`, `packages/shared/src/regras.test.ts`
- Specs: `docs/specs/spec-financeiro-dre.md`

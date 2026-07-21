---
type: spec
issue_type: feature
category: feature
status: done
domain: custos
owner: Produto (Niflow)
branch: feat/custos-centros
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [CUSTOS] Custos e centros de custo

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

Os custos da operação (marketing, folha, despesas de um carro específico) ficam dispersos. Sem centros de custo e lançamentos organizados, o DRE não fecha e o custo por carro é impreciso.

### 1.2 Objetivo

Registrar lançamentos de custo, organizados por centro de custo e opcionalmente ligados a um carro, alimentando o DRE.

### 1.3 Contexto de negócio

Módulo 6 (PRD §6). Alimenta [spec-financeiro-dre](spec-financeiro-dre.md) (custos operacionais) e o lucro por negócio.

### 1.4 Regras de negócio

- RN-01: um lançamento pertence a um centro de custo e opcionalmente a um negócio (custo do carro).
- RN-02: custos entram no DRE do período (RB3) via `vw_custos_mensal`.
- RN-03: isolamento por tenant.

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Custo por carro | Σ lançamentos do negócio | contexto | — | — |
| Custo operacional/mês | Σ lançamentos do período | controlado | — | crescente |

### 1.6 Escopo

ENTRA: centros de custo, lançamentos, vínculo opcional a negócio, agregação mensal.
NÃO ENTRA: aprovação de despesa/workflow; conciliação bancária.

### 1.7 Stakeholders

- Quem pediu: dono. Quem valida: Financeiro. Quem usa: Financeiro.

### 1.8 Critérios de aceite (visão PM)

- [x] Lançar custo em um centro; ligar a um carro.
- [x] Custos refletem no DRE.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Financeiro lançando despesas do mês.

### 2.2 Fluxo do usuário

Custos → escolhe centro → lança valor/descrição → (opcional) vincula a negócio.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Custos.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Table/Form/Card | sim | — |

### 2.5 Estados e edge cases

- Sem centros: cria o primeiro.
- Permissão: viewer lê.

### 2.6 Critérios de aceite (visão UX)

- [x] Lançamento rápido.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual.

### 3.2 Arquitetura

- Rota: `apps/api/src/routes/financeiro.ts` (custos).
- Schema: `centros_custo`, `lancamentos_custo` (`20260701000100_crm_core.sql`); view `vw_custos_mensal` (`20260701000300_views_rpc.sql`).
- Validação: `custoSchema` (`packages/shared/src/schemas.ts`).

### 3.3 Decisões técnicas

Agregação no banco ([ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md)).

### 3.4 Estimativa de complexidade

Baixa/Média.

### 3.5 Critérios de aceite (visão Tech)

- [x] Lançamentos entram na view mensal sob RLS.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Centros de custo, lançamentos com vínculo opcional a negócio, agregação mensal para o DRE, tela de custos.

### 4.2 Desvios do planejado

Nenhum registrado.

### 4.3 Validação (QA)

- [x] Custos operacionais refletem no `dre_anual`.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

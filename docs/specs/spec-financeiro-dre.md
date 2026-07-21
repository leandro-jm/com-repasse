---
type: spec
issue_type: feature
category: feature
status: done
domain: financeiro
owner: Produto (Niflow)
branch: feat/financeiro-dre
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [FINANCEIRO] Dashboard financeiro / DRE mensal

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

O lojista não enxerga os números da empresa de forma consolidada: receita, lucro, custo por carro, ROI. A planilha não fecha um DRE. Sem isso, decisões (quanto pagar por um carro, qual canal investir) são no achismo.

### 1.2 Objetivo

Entregar um DRE mensal/anual e indicadores de resultado que fecham com o lucro por negócio, calculados no banco e isolados por tenant.

### 1.3 Contexto de negócio

Módulo 4 (PRD §4, §6). Consome negócios ([spec-negocios-gestao-carros](spec-negocios-gestao-carros.md)), custos ([spec-custos-centros](spec-custos-centros.md)) e acordos ([spec-acordos-juridico](spec-acordos-juridico.md)).

### 1.4 Regras de negócio

- RN-01 (RB2): `receita_bruta = venda − compra` no período.
- RN-02 (RB3): `lucro_líquido = receita_bruta − custos_pagos_cliente − custos_operacionais − comissão − marketing − folha − não_operacional` (espelhado em `regras.ts::lucroLiquido` e no RPC `dre_anual`).
- RN-03: agregações por período **e tenant**, via views/RPC respeitando RLS ([ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md)).

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Lucro líquido | RB3 | > 0 | ~ 0 | < 0 |
| Receita bruta | RB2 | crescente | estável | decrescente |
| Ticket médio | faturamento ÷ nº vendas | contexto | — | — |

### 1.6 Escopo

ENTRA: DRE anual (por mês), indicadores de resultado, integração de custos e acordos.
NÃO ENTRA: contabilidade fiscal completa; conciliação bancária.

### 1.7 Stakeholders

- Quem pediu: dono/lojista. Quem valida: Financeiro. Quem usa: Financeiro, Owner (leitura).

### 1.8 Critérios de aceite (visão PM)

- [x] DRE do ano com quebra mensal.
- [x] Números fecham com o lucro por negócio.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built) — calibração com planilha real fica como follow-up (PRD §14).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Financeiro fechando o mês; Owner conferindo resultado.

### 2.2 Fluxo do usuário

Dashboard → seleciona ano → vê DRE mensal + indicadores (gráficos recharts).

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Dashboard.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Card/Chart (recharts) | sim | dashboards |

### 2.5 Estados e edge cases

- Sem lançamentos: DRE zerado, sem `#DIV/0!` (null-safe em `regras.ts`).
- Permissão: viewer lê; edição de custos é do Financeiro.

### 2.6 Critérios de aceite (visão UX)

- [x] Gráficos legíveis no mobile.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; agregação no banco.

### 3.2 Arquitetura

- Rota: `apps/api/src/routes/financeiro.ts` (DRE, ROI, custos, acordos, pagamentos, anexos, investimentos).
- Schema: views `vw_negocios_mensal`, `vw_custos_mensal` (`security_invoker`) e RPC `dre_anual(p_ano)` em `20260701000300_views_rpc.sql`; redefinido em `20260707000000_dre_custos_operacionais.sql` e `20260715000100_dre_acordos.sql`.
- Espelho cliente: `packages/shared/src/regras.ts` (RB2/RB3).

### 3.3 Decisões técnicas

Cálculo no banco com RLS ([ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md)); acesso via API ([ADR-0002](../adr/adr-0002-arquitetura-tres-camadas-api.md)).

### 3.4 Estimativa de complexidade

Média/Alta — RPCs de DRE com custos operacionais e acordos integrados.

### 3.5 Critérios de aceite (visão Tech)

- [x] DRE reconcilia com RB1 por negócio.
- [x] Views respeitam RLS do consultante.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

DRE anual/mensal via RPC, indicadores de resultado, integração de custos operacionais e acordos ao DRE, dashboard com gráficos.

### 4.2 Desvios do planejado

DRE evoluiu em duas migrations (custos operacionais; acordos) após a versão inicial.

### 4.3 Validação (QA)

- [x] `regras.test.ts` cobre RB2/RB3.
- [x] Isolamento por tenant nas views.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

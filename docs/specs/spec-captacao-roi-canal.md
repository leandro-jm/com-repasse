---
type: spec
issue_type: feature
category: feature
status: done
domain: captacao
owner: Produto (Niflow)
branch: feat/captacao-roi-canal
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [CAPTAÇÃO] ROI por canal de aquisição

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

O lojista investe em canais (marketplace, indicação, tráfego) sem saber qual traz lead barato e qual converte em venda. Não há CPL/CPS por canal, então o dinheiro de marketing é gasto no escuro.

### 1.2 Objetivo

Medir custo por lead (CPL) e custo por venda (CPS) por canal, e o ROI de cada fonte, para direcionar investimento.

### 1.3 Contexto de negócio

Módulo 5 (PRD §5, §7). Cruza `fontes_lead` (canal de origem do negócio) com `canal_investimentos` (quanto foi investido no canal).

### 1.4 Regras de negócio

- RN-01 (RB6): `CPL = investimento_do_canal ÷ leads_do_canal`; `CPS = investimento_do_canal ÷ vendas_do_canal`. Divisor 0 → `null` (sem `#DIV/0!`), conforme `regras.ts::cpl/cps`.
- RN-02: fontes de lead são um dropdown controlado por tenant (`fontes_lead`).
- RN-03: isolamento por tenant.

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| CPL | RB6 | baixo | — | alto |
| CPS | RB6 | baixo | — | alto |
| ROI do canal | (receita − investimento) ÷ investimento | > 0 | ~ 0 | < 0 |

### 1.6 Escopo

ENTRA: cadastro de fontes/canais, registro de investimento por canal, cálculo de CPL/CPS/ROI por canal.
NÃO ENTRA: integração automática com plataformas de anúncio.

### 1.7 Stakeholders

- Quem pediu: dono. Quem valida: Financeiro. Quem usa: Financeiro, Owner.

### 1.8 Critérios de aceite (visão PM)

- [x] Ver CPL/CPS/ROI por canal no período.
- [x] Sem `#DIV/0!` quando não há leads/vendas.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Financeiro avaliando onde investir no próximo mês.

### 2.2 Fluxo do usuário

Captação → registra investimento por canal → vê CPL/CPS/ROI por fonte.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Captacao.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Card/Chart/Table | sim | — |

### 2.5 Estados e edge cases

- Canal sem leads/vendas: métrica `null`, exibida como "—".
- Permissão: viewer lê.

### 2.6 Critérios de aceite (visão UX)

- [x] Tabela/gráfico por canal.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; agregação no banco.

### 3.2 Arquitetura

- Rota: `apps/api/src/routes/financeiro.ts` (investimentos + ROI).
- Schema: `fontes_lead` (`20260701000100_crm_core.sql`), `canal_investimentos` (`20260702000000_finalizacoes.sql`), RPC `roi_por_canal` (`20260701000300_views_rpc.sql`).
- Espelho cliente: `regras.ts::cpl/cps/ticketMedio`.

### 3.3 Decisões técnicas

Cálculo no banco ([ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md)).

### 3.4 Estimativa de complexidade

Média.

### 3.5 Critérios de aceite (visão Tech)

- [x] RB6 null-safe coberto por teste.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Fontes de lead, investimento por canal, RPC de ROI, CPL/CPS null-safe, tela de captação.

### 4.2 Desvios do planejado

Nenhum registrado.

### 4.3 Validação (QA)

- [x] `regras.test.ts` cobre CPL/CPS.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

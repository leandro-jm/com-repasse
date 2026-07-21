---
type: spec
issue_type: feature
category: feature
status: done
domain: acordos
owner: Produto (Niflow)
branch: feat/acordos-juridico
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [ACORDOS] Acordos jurídicos e pagamentos

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

No repasse, o comprador muitas vezes paga antes de o papel fechar (negócio baseado em confiança). Surgem disputas e acordos de pagamento parcelado. Sem controle de saldo e histórico, o lojista perde dinheiro e não tem registro para cobrança.

### 1.2 Objetivo

Registrar acordos (disputa/parcelamento) com saldo calculado automaticamente conforme os pagamentos entram, com anexos e código de caso.

### 1.3 Contexto de negócio

Módulo 7 (PRD §7). Integra ao DRE ([spec-financeiro-dre](spec-financeiro-dre.md)).

### 1.4 Regras de negócio

- RN-01 (RB4): `saldo = valor_original − Σ pagamentos`. Mantido por trigger `recalc_saldo_acordo` no banco; espelhado em `regras.ts::saldoAcordo`.
- RN-02: cada acordo tem um tipo (`tipo_acordo`) e um código de caso sequencial por tenant (trigger `gerar_codigo_caso`).
- RN-03: anexos limitados (`MAX_ANEXOS_ACORDO=10`, `MAX_ANEXO_BYTES=5MB`).
- RN-04: isolamento por tenant.

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Saldo em aberto | Σ saldos > 0 | baixo | — | alto |
| Acordos quitados | saldo = 0 | crescente | — | — |

### 1.6 Escopo

ENTRA: cadastro de acordos com tipo/código, pagamentos, saldo automático, anexos, status.
NÃO ENTRA: geração de petição/documento jurídico; integração com cartório.

### 1.7 Stakeholders

- Quem pediu: dono. Quem valida: Financeiro/jurídico. Quem usa: Financeiro.

### 1.8 Critérios de aceite (visão PM)

- [x] Saldo atualiza sozinho ao registrar pagamento.
- [x] Código de caso único por tenant.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Financeiro acompanhando um acordo parcelado e anexando comprovantes.

### 2.2 Fluxo do usuário

Acordos → cria acordo (tipo, valor, código gerado) → registra pagamentos → saldo cai → anexa comprovantes.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Acordos.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Card/Table/Upload | sim | anexos |

### 2.5 Estados e edge cases

- Pagamento que zera o saldo: status muda para quitado.
- Anexo acima do limite: rejeitado.
- Permissão: viewer lê.

### 2.6 Critérios de aceite (visão UX)

- [x] Saldo visível e sempre correto.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; saldo por trigger.

### 3.2 Arquitetura

- Rota: `apps/api/src/routes/financeiro.ts` (acordos, pagamentos, anexos).
- Schema: `acordos` (saldo por trigger), `acordo_pagamentos` (`20260701000100_crm_core.sql`); `acordo_anexos` (`20260704000000_acordo_anexos.sql`); `tipo_acordo`, `acordo_sequencias`, `gerar_codigo_caso`, `recalc_saldo_acordo` redefinido (`20260715000000_acordos_melhorias.sql`); integração DRE (`20260715000100_dre_acordos.sql`).
- Validação: `acordoSchema`, `pagamentoSchema` (`schemas.ts`).

### 3.3 Decisões técnicas

Saldo calculado no banco ([ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md)).

### 3.4 Estimativa de complexidade

Média/Alta — triggers de saldo, código sequencial, anexos, DRE.

### 3.5 Critérios de aceite (visão Tech)

- [x] RB4 coberto (`regras.test.ts`); saldo consistente após pagamentos.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Acordos com tipo/código sequencial, pagamentos, saldo automático por trigger, anexos com limite, integração ao DRE, tela de acordos.

### 4.2 Desvios do planejado

Melhorias de acordos (tipo, observações, sequência de código, status) vieram em migration posterior (`20260715000000`).

### 4.3 Validação (QA)

- [x] Saldo (RB4) confere após múltiplos pagamentos.
- [x] Código de caso único por tenant.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

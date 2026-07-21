---
type: spec
issue_type: feature
category: feature
status: done
domain: negocios
owner: Produto (Niflow)
branch: feat/negocios-gestao-carros
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17 para registrar o que já foi entregue. Discovery vem do PRD; Design/Tech/Implementação, da implementação real. Aceite formal do dono do domínio pendente.

# [NEGÓCIOS] Gestão de negócios (carros de repasse)

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

O lojista controlava os carros de repasse numa planilha mensal frágil: linha por carro, sem histórico confiável, sem lucro calculado, sem fotos organizadas. No repasse não existe estoque/catálogo — o carro entra e sai rápido (retirada → entrega). Perder o controle de um negócio significa perder dinheiro e credibilidade.

### 1.2 Objetivo

Substituir a planilha por um cadastro de negócios que calcula o lucro sozinho, guarda as fotos e serve de base para campanha, contrato e financeiro.

### 1.3 Contexto de negócio

O **negócio** é a entidade central do CRM (`PRD_CRM_Carvalho_Junior.md §4/§6`) — um carro passando pela operação, não um item de estoque. Alimenta os módulos de campanha ([spec-campanhas-whatsapp](spec-campanhas-whatsapp.md)), contrato ([spec-contratos-pdf](spec-contratos-pdf.md)) e financeiro ([spec-financeiro-dre](spec-financeiro-dre.md)).

### 1.4 Regras de negócio

- RN-01 (RB1): `lucro = valor_venda − (valor_compra + custos_pagos_cliente + custos_operacionais + comissao_terceiros)`. Calculado no banco como coluna `GENERATED` ([ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md)); espelhado em `packages/shared/src/regras.ts::lucroNegocio` para previews.
- RN-02: todo negócio pertence a um `tenant_id`; leitura/escrita filtradas por RLS ([ADR-0001](../adr/adr-0001-isolamento-multitenant-rls.md)).
- RN-03: máximo de **15 fotos** por negócio (`MAX_FOTOS_POR_NEGOCIO`), uma marcada como capa (índice único).
- RN-04: o tipo de documento do negócio é `procuração` ou `DUT`; datas de retirada/entrega registram o ciclo do carro.

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Lucro por negócio | RB1 | > 0 | ~ 0 | < 0 |
| Ticket médio | faturamento ÷ nº vendas | contexto do tenant | — | — |

### 1.6 Escopo

ENTRA:
- Cadastro/edição/listagem de negócios com valores, custos, comprador, canal, documento e datas.
- Upload/gestão de fotos (capa), com limite e validação de MIME/tamanho.
- Lucro calculado automaticamente.

NÃO ENTRA:
- Catálogo/estoque persistente (o repasse não tem esse conceito — PRD §4.2).
- Funil/pipeline de vendas complexo.

### 1.7 Stakeholders

- Quem pediu: lojista (Carvalho Júnior, tenant piloto).
- Quem valida: dono do domínio / Produto.
- Quem usa: Operador (mobile-first), Admin, Financeiro (leitura).

### 1.8 Critérios de aceite (visão PM)

- [x] Cadastrar um negócio calcula o lucro sem intervenção manual.
- [x] Até 15 fotos por negócio, com capa.
- [x] Um tenant não vê negócios de outro.

### 1.9 Questões em aberto (clarify)

Não se aplica (registro as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, aprovação retroativa pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Operador no celular, no pátio, cadastrando um carro recém-comprado e fotografando na hora.

### 2.2 Fluxo do usuário

Lista de negócios → "novo" → formulário (valores/comprador/canal/documento/datas) → upload de fotos → salvar (lucro aparece calculado) → negócio vira base para campanha/contrato.

### 2.3 Protótipo

- Alta: telas reais `apps/web/src/pages/Negocios.tsx` (lista) e `apps/web/src/pages/NegocioForm.tsx` (cadastro).

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Card/Button/Badge/Tabs | sim | `apps/web/src/components/ui/` |

### 2.5 Estados e edge cases

- Sem fotos: negócio válido, sem capa.
- Erro de upload: rejeita MIME/tamanho inválido (`constants.ts`).
- Permissão: viewer só lê; não-viewer escreve (RBAC).

### 2.6 Critérios de aceite (visão UX)

- [x] Fluxo mobile-first validado.
- [x] Capa de foto selecionável.

`Aprovado por (design): — (as-built, aprovação retroativa pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Feito com a stack atual (Hono + Supabase + Storage). Sem dependência nova além de `@crm/shared`.

### 3.2 Arquitetura

- Rotas: `apps/api/src/routes/negocios.ts` (CRUD), `apps/api/src/routes/storage.ts` (upload de fotos).
- Schema: tabela `negocios` (com `lucro` GENERATED) e `negocio_fotos` (índice único de capa) em `supabase/migrations/20260701000100_crm_core.sql`.
- Storage: bucket `fotos` (público) com RLS por prefixo de path (`tenant_id`).
- Validação: schemas Zod em `packages/shared/src/schemas.ts`; limites em `constants.ts`.

### 3.3 Decisões técnicas

Lucro no banco ([ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md)); acesso via API com RLS ([ADR-0002](../adr/adr-0002-arquitetura-tres-camadas-api.md), [ADR-0001](../adr/adr-0001-isolamento-multitenant-rls.md)).

### 3.4 Estimativa de complexidade

Média — CRUD + upload + coluna calculada + RLS.

### 3.5 Critérios de aceite (visão Tech)

- [x] typecheck limpo; testes de regras passando (`regras.test.ts`).
- [x] RLS por tenant; storage isolado por path.

`Aprovado por (tech): — (as-built, aprovação retroativa pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

CRUD de negócios com lucro calculado no banco, gestão de fotos com capa e limite (15), isolamento por tenant. Telas de lista e formulário mobile-first.

### 4.2 Desvios do planejado

Nenhum registrado (reconstrução as-built).

### 4.3 Validação (QA)

- [x] Lucro confere com RB1 (`packages/shared/src/regras.test.ts`).
- [x] Isolamento por tenant (seed com 2 tenants — Carvalho Júnior e Repasse Silva).

Validado por: — · 2026-07-17 · registro as-built a partir do código

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal do dono do domínio pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17 (migrations de julho/2026).

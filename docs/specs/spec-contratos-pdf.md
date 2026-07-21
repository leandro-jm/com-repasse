---
type: spec
issue_type: feature
category: feature
status: done
domain: contratos
owner: Produto (Niflow)
branch: feat/contratos-pdf
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [CONTRATOS] Contrato de compra/venda em PDF

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

O lojista escreve contrato de compra/venda à mão ou copia de um modelo antigo, com erro e retrabalho. Precisa gerar rápido, com os dados do negócio já preenchidos, e com um modelo padrão da casa (versionável por tenant).

### 1.2 Objetivo

Gerar um PDF de contrato pré-preenchido a partir do negócio, usando um template versionável por tenant.

### 1.3 Contexto de negócio

Módulo 8 (PRD §8). Consome os dados de [spec-negocios-gestao-carros](spec-negocios-gestao-carros.md).

### 1.4 Regras de negócio

- RN-01: template resolvido por precedência — escolhido > default do tenant > embutido (`TEMPLATE_PADRAO_CONTRATO`).
- RN-02: PDF gerado é privado; entregue via URL assinada de curta duração (600s).
- RN-03: um único template default por tenant (trigger de default único).
- RN-04: isolamento por tenant (path do bucket por `tenant_id`).

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Contratos gerados | contagem | — | — | — |
| Tempo de geração | latência | < 2s | — | > 5s |

### 1.6 Escopo

ENTRA: templates de contrato por tenant (default único), geração de PDF pré-preenchido, download por URL assinada.
NÃO ENTRA: assinatura eletrônica/e-sign; envio automático ao comprador.

### 1.7 Stakeholders

- Quem pediu: lojista. Quem valida: Produto. Quem usa: Operador.

### 1.8 Critérios de aceite (visão PM)

- [x] Gerar PDF a partir de um negócio, com dados preenchidos.
- [x] Editar o template padrão do tenant.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Operador fechando negócio e gerando o contrato na hora.

### 2.2 Fluxo do usuário

Negócio/Contratos → escolhe template → gera PDF → baixa via link assinado. Config → edita template padrão do tenant.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Contratos.tsx`; edição de template em `apps/web/src/pages/Config.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Card/Form/Button | sim | — |

### 2.5 Estados e edge cases

- Sem template do tenant: usa o embutido.
- Dados faltando no negócio: campos em branco no PDF (não bloqueia).
- Permissão: viewer não gera.

### 2.6 Critérios de aceite (visão UX)

- [x] Preview/geração simples.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

`pdf-lib` para gerar PDF no servidor; Storage privado.

### 3.2 Arquitetura

- Rota: `apps/api/src/routes/contratos.ts`; geração em `apps/api/src/pdf.ts` (`textoParaPdf`).
- Montagem de texto: `packages/shared/src/contrato.ts` (`TEMPLATE_PADRAO_CONTRATO`, `montarContrato`, `DadosContrato`).
- Schema: `tenants.template_contrato` (`20260702000100_contrato_template.sql`); tabela `contrato_templates` + default único (`20260716000000_contrato_templates.sql`); `contratos` (`20260701000100_crm_core.sql`).
- Storage: bucket privado `contratos`, path `{tenantId}/{negocio_id}/{contrato.id}.pdf`, URL assinada 600s.
- Validação: `contratoGerarSchema`, `contratoTemplateSchema` (`schemas.ts`).

### 3.3 Decisões técnicas

Geração server-side (dado sensível, [ADR-0002](../adr/adr-0002-arquitetura-tres-camadas-api.md)); template compartilhado em `@crm/shared` ([ADR-0009](../adr/adr-0009-monorepo-pnpm-shared.md)).

### 3.4 Estimativa de complexidade

Média — templates versionados + geração de PDF + storage privado.

### 3.5 Critérios de aceite (visão Tech)

- [x] PDF gerado e acessível só por URL assinada.
- [x] Precedência de template respeitada.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Templates de contrato por tenant (default único), geração de PDF pré-preenchido com `pdf-lib`, entrega por URL assinada, edição de template na config.

### 4.2 Desvios do planejado

Evoluiu de um campo único (`tenants.template_contrato`) para uma tabela de templates (`contrato_templates`) com default único.

### 4.3 Validação (QA)

- [x] `contrato.test.ts` cobre `montarContrato`.
- [x] Precedência de template e URL assinada exercitadas.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

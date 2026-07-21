---
type: spec
issue_type: feature
category: feature
status: done
domain: contatos
owner: Produto (Niflow)
branch: feat/contatos-base-optin
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Discovery do PRD; demais fases da implementação real. Aceite formal pendente.

# [CONTATOS] Base de contatos com opt-in e import CSV

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

A lista de transmissão do lojista foi bloqueada pela Meta; grupos não funcionam (70–90% ignoram). Ele precisa de uma base enxuta (~100 compradores reais), segmentada, com opt-in explícito, para disparar "carro novo" sem cair em bloqueio.

### 1.2 Objetivo

Ter uma base de contatos própria, segmentada e com opt-in, que alimenta as campanhas de WhatsApp com segurança de LGPD.

### 1.3 Contexto de negócio

É a base do motor de campanhas (`PRD_CRM_Carvalho_Junior.md §1.1`, módulo 2). ~100 contatos foram importados via CSV no piloto. Alimenta [spec-campanhas-whatsapp](spec-campanhas-whatsapp.md).

### 1.4 Regras de negócio

- RN-01: contatos são segmentados por tipo — `lojista`, `cliente_final`, `captador`.
- RN-02 (RB5): só é elegível para campanha o contato com `opt_in_whatsapp = true` **e** `ativo = true`.
- RN-03: opt-out é público e não requer login (`optout_contato(uuid)` via link no rodapé de cada mensagem — LGPD).
- RN-04: telefone normalizado para E.164 BR (`normalizarTelefoneBR`).
- RN-05: isolamento por tenant (RLS).

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Base elegível | contatos com opt-in ativo | crescente | estável | decrescente |
| Taxa de opt-out | opt-outs ÷ enviados | baixa | — | alta |

### 1.6 Escopo

ENTRA: CRUD de contatos, tags/segmentação por tipo, opt-in/opt-out, import CSV em lote, normalização de telefone.
NÃO ENTRA: enriquecimento externo de dados; histórico de conversas 1:1.

### 1.7 Stakeholders

- Quem pediu: lojista. Quem valida: Produto. Quem usa: Operador.

### 1.8 Critérios de aceite (visão PM)

- [x] Importar ~100 contatos por CSV.
- [x] Marcar opt-in/opt-out; opt-out público via link.
- [x] Segmentar por tipo.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Operador importando a planilha de compradores e limpando a base (ativos/opt-in).

### 2.2 Fluxo do usuário

Lista de contatos → import CSV (ou cadastro manual) → marcar tipo/opt-in → base pronta para campanha. Destinatário: recebe mensagem → clica no link do rodapé → opt-out registrado.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Contatos.tsx`; página pública de opt-out `apps/web/src/pages/Optout.tsx` (rota `/sair/:id`).

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Tabela/Badge/Toast | sim | `components/ui/` |

### 2.5 Estados e edge cases

- CSV com telefone inválido: normaliza ou rejeita a linha.
- Contato sem opt-in: fica fora da campanha (RB5).
- Opt-out de um contato inexistente: página pública trata sem vazar dados.

### 2.6 Critérios de aceite (visão UX)

- [x] Import em lote com feedback.
- [x] Opt-out público sem login.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; sem dependência nova.

### 3.2 Arquitetura

- Rotas: `apps/api/src/routes/contatos.ts` (CRUD + import em lote), `apps/api/src/routes/publico.ts` (opt-out público, sem auth).
- Schema: `contatos` (com `opt_in_whatsapp`, `ativo`, tipo) em `20260701000100_crm_core.sql`; RPC `optout_contato` em `20260702000200_optout.sql`.
- Helpers: `normalizarTelefoneBR`, `linkCarroPublico` (`packages/shared/src/whatsapp.ts`).

### 3.3 Decisões técnicas

Opt-out via RPC público security-definer (expõe só o necessário) — coerente com [ADR-0007](../adr/adr-0007-calculo-no-banco-generated-views-rpc.md); acesso via API ([ADR-0002](../adr/adr-0002-arquitetura-tres-camadas-api.md)).

### 3.4 Estimativa de complexidade

Média — CRUD + import em lote + rota pública.

### 3.5 Critérios de aceite (visão Tech)

- [x] Import idempotente; telefone normalizado.
- [x] Opt-out público sem vazar PII.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

CRUD + segmentação + opt-in, import CSV em lote, opt-out público (LGPD), normalização E.164.

### 4.2 Desvios do planejado

Nenhum registrado.

### 4.3 Validação (QA)

- [x] Elegibilidade RB5 exercitada no fluxo de campanha.
- [x] Opt-out público testado com contato do seed.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

---
type: spec
issue_type: feature
category: feature
status: done
domain: planos
owner: Produto (Niflow)
branch: feat/planos-assinaturas
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Aceite formal pendente.

# [PLANOS] Planos, assinaturas, limites e billing

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

Para virar produto vendável, cada tenant precisa de um plano com limites (ex.: envios/mês), assinatura com status, medição de uso e cobrança. Sem isso, não há monetização nem controle de consumo.

### 1.2 Objetivo

Oferecer planos com entitlements/limites, assinaturas com status, medição mensal de uso e cobrança abstraída (manual hoje, gateway plugável depois).

### 1.3 Contexto de negócio

Camada comercial (PRD §7.5/§10, módulo 10). Detalha [ADR-0010](../adr/adr-0010-billing-abstraido.md). O limite de envios governa [spec-campanhas-whatsapp](spec-campanhas-whatsapp.md).

### 1.4 Regras de negócio

- RN-01 (RB8): disparo só ocorre se `uso_mensal.envios + destinatários ≤ plano.limite_envios_mes`.
- RN-02: planos definem `modulos` (feature flags), limites e `white_label`. Seed: Starter R$99 / Pro R$249 / Agência R$599.
- RN-03: assinatura tem status (`ativa`/`cancelada`/...); tenant cancelado bloqueia rotas de dados.
- RN-04: cobrança via `BillingProvider` (`manual` por default); webhooks atualizam `assinaturas.status`.

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Uso vs. limite | `uso_mensal.envios` ÷ `limite_envios_mes` | < 80% | 80–100% | estourado |
| Assinaturas ativas | contagem status=ativa | crescente | — | — |

### 1.6 Escopo

ENTRA: planos com entitlements/limites, assinaturas + status, medição mensal, fiscalização de limites, provider de billing abstraído (manual).
NÃO ENTRA: integração real com gateway BR (Asaas/Iugu/Pagar.me — em aberto, PRD §14).

### 1.7 Stakeholders

- Quem pediu: plataforma. Quem valida: Produto/Comercial. Quem usa: Owner (assinatura), super-admin (planos).

### 1.8 Critérios de aceite (visão PM)

- [x] Cada tenant tem plano + assinatura com status.
- [x] Limite de envios bloqueia/avisa ao estourar.
- [x] Módulos habilitados por plano (feature flags).

### 1.9 Questões em aberto (clarify)

Gateway de billing e estrutura de preço final ficam como follow-up (PRD §14).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Owner assinando/gerenciando o plano; super-admin definindo planos/limites.

### 2.2 Fluxo do usuário

Assinatura → escolhe plano → assina (manual: ativa direto) → uso medido no mês → aviso ao aproximar do limite.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Assinatura.tsx`; planos/limites no `apps/web/src/pages/Backoffice.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Pricing/Card/Progress | sim | landing + assinatura |

### 2.5 Estados e edge cases

- Limite estourado: bloqueia disparo (RB8).
- Assinatura cancelada: rotas de dados bloqueadas (`requireTenantAtivo`).
- Provider `manual`: ativa sem gateway.

### 2.6 Critérios de aceite (visão UX)

- [x] Uso vs. limite visível.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; billing abstraído.

### 3.2 Arquitetura

- Rota: `apps/api/src/routes/billing.ts` (subscribe + webhook).
- Provider: `apps/api/src/billing/provider.ts` (`BillingProvider`, `ManualProvider`, `getBillingProvider`).
- Schema: `planos`, `assinaturas`, `uso_mensal` (`20260701000000_saas_core.sql`); RPCs de metering `reservar_envios`/`liberar_envios`/`registrar_envios`/`pode_disparar`/`envios_restantes`.
- Fiscalização: `requireTenantAtivo` (`middleware/auth.ts`); RB8 em `regras.ts::podeDisparar`.

### 3.3 Decisões técnicas

Billing abstraído ([ADR-0010](../adr/adr-0010-billing-abstraido.md)); metering atômico ([ADR-0006](../adr/adr-0006-worker-campanhas-metering-atomico.md)).

### 3.4 Estimativa de complexidade

Média/Alta — entitlements, metering, webhooks.

### 3.5 Critérios de aceite (visão Tech)

- [x] RB8 aplicado no enqueue de campanha.
- [x] Webhook atualiza status de assinatura.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Planos com módulos/limites/white-label, assinaturas com status, medição mensal, fiscalização de limite de envios, provider de billing manual com pontos de plug para gateways.

### 4.2 Desvios do planejado

Gateway real ainda não integrado (decisão em aberto) — provider `manual` cobre o piloto.

### 4.3 Validação (QA)

- [x] Seed com 3 planos + 2 tenants.
- [x] Bloqueio por limite e por tenant cancelado exercitados.

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

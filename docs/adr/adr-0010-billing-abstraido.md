---
type: adr
id: ADR-0010
status: aceita
domain: billing
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-planos-assinaturas]
---

# ADR-0010 — Billing abstraído (`BillingProvider`), manual hoje

## Contexto

O produto é vendido por assinatura (planos Starter/Pro/Agência), com cobrança recorrente em BR (PIX/boleto/cartão). O gateway (Asaas / Iugu / Pagar.me) ainda é uma decisão em aberto (PRD §14), e o piloto (Carvalho Júnior como tenant 0) não precisa de cobrança automática. Não podemos travar o produto esperando a escolha do gateway, nem acoplar a lógica de assinatura a um provedor específico.

## Decisão

**Abstração `BillingProvider` com implementação `ManualProvider` como default.** `getBillingProvider()` decide por `BILLING_PROVIDER` (default `manual`, sem gateway externo — a assinatura já nasce `ativa`). Os pontos de plug para Asaas/Iugu/Pagar.me estão marcados no código (`apps/api/src/billing/provider.ts`), incluindo webhooks que atualizam `assinaturas.status` (`BILLING_WEBHOOK_SECRET`).

A **fiscalização de limites** lê `planos` + `uso_mensal` e é independente do provider — o bloqueio de envios por limite (RB8) e o gate de tenant cancelado (`requireTenantAtivo`) funcionam mesmo com billing `manual`.

## Alternativas consideradas

- **Escolher e integrar um gateway agora** — decisão ainda aberta (§14) e desnecessária pro piloto; integraria antes de validar preço/plano com dados reais. Adiado.
- **Sem camada de abstração (acoplar ao gateway escolhido)** — travaria a migração e o piloto. Rejeitado.
- **Billing 100% externo (fora do app)** — perderíamos a fiscalização de limites acoplada ao produto. Rejeitado.

## Consequências

### Positivas

- Piloto e vendas manuais funcionam sem gateway.
- Trocar/adicionar gateway é implementar a interface — sem mexer na lógica de assinatura/limites.
- Fiscalização de limites (RB8) é independente do provider.

### Negativas · trade-offs

- A interface pode precisar evoluir quando o gateway real trouxer requisitos não previstos (split, antecipação, chargeback).
- `manual` exige processo humano de ativação/baixa enquanto não houver gateway.
- Webhooks reais precisam de verificação de assinatura robusta (`BILLING_WEBHOOK_SECRET`) — só esboçada hoje.

## Referências

- PRD `PRD_CRM_Carvalho_Junior.md §7.5`, §10.3, §14
- `apps/api/src/billing/provider.ts`, `apps/api/src/routes/billing.ts`
- `supabase/migrations/20260701000000_saas_core.sql` (`planos`, `assinaturas`, `uso_mensal`)
- Specs: `docs/specs/spec-planos-assinaturas.md`

/**
 * Abstração de billing (§7.5). Permite plugar gateways BR (Asaas/Iugu/Pagar.me)
 * sem tocar no restante. Hoje há o provider `manual` (sem gateway externo);
 * o enforcement de limite e a suspensão já funcionam independentemente disso.
 */
export type StatusAssinatura = 'trial' | 'ativa' | 'inadimplente' | 'cancelada';

export interface CriarAssinaturaInput {
  tenantId: string;
  planoId: string;
  precoMensal: number;
  emailCobranca?: string | null;
}

export interface CriarAssinaturaResult {
  gateway: string;
  gateway_subscription_id: string;
  status: StatusAssinatura;
  checkout_url: string | null;
}

export interface WebhookResult {
  gateway_subscription_id: string;
  status: StatusAssinatura;
}

export interface BillingProvider {
  nome: string;
  criarAssinatura(input: CriarAssinaturaInput): Promise<CriarAssinaturaResult>;
  parseWebhook(body: unknown): WebhookResult | null;
}

/**
 * Provider manual: sem gateway externo. A assinatura nasce ativa e o status
 * pode ser alterado por webhook simulado (ou pelo back-office).
 */
export class ManualProvider implements BillingProvider {
  nome = 'manual';

  async criarAssinatura(input: CriarAssinaturaInput): Promise<CriarAssinaturaResult> {
    return {
      gateway: this.nome,
      gateway_subscription_id: `man_${input.tenantId.slice(0, 8)}_${input.planoId.slice(0, 8)}`,
      status: 'ativa',
      checkout_url: null,
    };
  }

  parseWebhook(body: unknown): WebhookResult | null {
    const b = body as { gateway_subscription_id?: string; status?: StatusAssinatura };
    if (!b?.gateway_subscription_id || !b.status) return null;
    return { gateway_subscription_id: b.gateway_subscription_id, status: b.status };
  }
}

// Plugue aqui outros providers (mesma interface):
// export class AsaasProvider implements BillingProvider { ... }
// export class IuguProvider  implements BillingProvider { ... }

export function getBillingProvider(): BillingProvider {
  switch (process.env.BILLING_PROVIDER) {
    case 'manual':
    default:
      return new ManualProvider();
  }
}

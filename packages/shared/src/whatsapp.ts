/**
 * Utilidades de campanha de WhatsApp: template default (texto livre) e telefone.
 * O texto da campanha é editável por tenant (tenants.template_campanha) e é
 * enviado literalmente — não há mais interpolação de variáveis de anúncio.
 */

/** Template default da campanha (RF3.4 permite sobrescrever por tenant). */
export const TEMPLATE_PADRAO_CAMPANHA = `🚗 Novidade no estoque!

Confira e chame no WhatsApp para mais informações.`;

/** Normaliza telefone BR para E.164 (RF2.1). Retorna null se inválido. */
export function normalizarTelefoneBR(input: string): string | null {
  const dig = input.replace(/\D/g, '');
  if (dig.startsWith('55') && (dig.length === 12 || dig.length === 13)) return `+${dig}`;
  if (dig.length === 10 || dig.length === 11) return `+55${dig}`;
  return null;
}

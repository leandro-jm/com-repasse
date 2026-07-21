/**
 * Template de anúncio de campanha (RF3.2, RF3.3) e utilidades de telefone.
 * O template é configurável por tenant; aqui fica o default e a interpolação.
 */

export interface DadosAnuncio {
  carro: string;
  ano?: number | null;
  km?: number | null;
  ipva_status?: 'pago' | 'aberto' | null;
  pneus?: string | null;
  gastos?: string | null;
  fipe?: number | null;
  preco_pedido?: number | null;
}

/** Template padrão de anúncio por tenant (RF3.4 permite sobrescrever). */
export const TEMPLATE_PADRAO_ANUNCIO = `🚗 *{{carro}}* {{ano}}
{{km}}
IPVA: {{ipva}} | Pneus: {{pneus}}
{{gastos}}
FIPE: {{fipe}}
💰 *{{preco}}*

👉 Mais detalhes e fotos: {{link}}`;

function brl(v?: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Interpola o template com os dados do anúncio + link da página pública. */
export function montarMensagem(
  template: string,
  dados: DadosAnuncio,
  linkDetalhes: string,
): string {
  const map: Record<string, string> = {
    carro: dados.carro,
    ano: dados.ano ? String(dados.ano) : '',
    km: dados.km != null ? `${dados.km.toLocaleString('pt-BR')} km` : '',
    ipva: dados.ipva_status === 'pago' ? 'pago' : dados.ipva_status === 'aberto' ? 'em aberto' : '—',
    pneus: dados.pneus ?? '—',
    gastos: dados.gastos ? `Gastos: ${dados.gastos}` : '',
    fipe: brl(dados.fipe),
    preco: brl(dados.preco_pedido),
    link: linkDetalhes,
  };
  return template
    .replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Link público "mais detalhes" do carro (RF3.3). */
export function linkCarroPublico(appUrl: string, negocioId: string): string {
  return `${appUrl.replace(/\/$/, '')}/c/${negocioId}`;
}

/** Normaliza telefone BR para E.164 (RF2.1). Retorna null se inválido. */
export function normalizarTelefoneBR(input: string): string | null {
  const dig = input.replace(/\D/g, '');
  if (dig.startsWith('55') && (dig.length === 12 || dig.length === 13)) return `+${dig}`;
  if (dig.length === 10 || dig.length === 11) return `+55${dig}`;
  return null;
}

/** Contrato de compra e venda (Módulo 8) — template + interpolação. */

export interface DadosContrato {
  vendedor: string;
  vendedor_doc?: string | null;
  carro: string;
  placa?: string | null;
  ano?: number | null;
  km?: number | null;
  valor_venda: number;
  comprador_nome: string;
  comprador_doc?: string | null;
  comprador_endereco?: string | null;
  cidade?: string | null;
  data?: string | null;
}

/** Interpolação genérica de {{chave}}. */
export function interpolar(template: string, map: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? '');
}

/**
 * Variáveis aceitas nos templates — é o contrato com quem escreve o texto.
 * Deve espelhar exatamente as chaves do map de montarContrato: chave fora desta
 * lista interpola para string vazia, sem aviso.
 */
export const VARIAVEIS_CONTRATO = [
  'vendedor',
  'vendedor_doc',
  'vendedor_doc_linha',
  'carro',
  'placa',
  'ano',
  'km',
  'valor_venda',
  'comprador_nome',
  'comprador_doc',
  'comprador_doc_linha',
  'comprador_endereco',
  'cidade',
  'data',
] as const;

export const TEMPLATE_PADRAO_CONTRATO = `CONTRATO DE COMPRA E VENDA DE VEÍCULO

Pelo presente instrumento particular, as partes abaixo qualificadas:

VENDEDOR: {{vendedor}}{{vendedor_doc_linha}}

COMPRADOR: {{comprador_nome}}{{comprador_doc_linha}}
Endereço: {{comprador_endereco}}

têm entre si, justo e contratado, a compra e venda do veículo abaixo, nas seguintes condições:

VEÍCULO
Modelo: {{carro}}
Placa: {{placa}}    Ano: {{ano}}    KM: {{km}}

VALOR
O valor total da transação é de {{valor_venda}}, quitado neste ato, dando o VENDEDOR
plena e geral quitação.

CLÁUSULAS
1. O veículo é vendido no estado em que se encontra, tendo o COMPRADOR o examinado previamente.
2. A partir desta data, responsabiliza-se o COMPRADOR por multas, tributos e encargos do veículo.
3. As partes elegem o foro da comarca de {{cidade}} para dirimir eventuais dúvidas.

{{cidade}}, {{data}}.


_______________________________
VENDEDOR: {{vendedor}}


_______________________________
COMPRADOR: {{comprador_nome}}`;

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function montarContrato(template: string, d: DadosContrato): string {
  const map: Record<string, string> = {
    vendedor: d.vendedor,
    // _doc é o valor cru; _doc_linha é o fragmento pronto usado pelo template padrão.
    vendedor_doc: d.vendedor_doc || '—',
    vendedor_doc_linha: d.vendedor_doc ? ` (CNPJ/CPF: ${d.vendedor_doc})` : '',
    carro: d.carro,
    placa: d.placa ?? '—',
    ano: d.ano ? String(d.ano) : '—',
    km: d.km != null ? `${d.km.toLocaleString('pt-BR')} km` : '—',
    valor_venda: brl(d.valor_venda),
    comprador_nome: d.comprador_nome,
    comprador_doc: d.comprador_doc || '—',
    comprador_doc_linha: d.comprador_doc ? ` (CPF: ${d.comprador_doc})` : '',
    comprador_endereco: d.comprador_endereco ?? '—',
    cidade: d.cidade ?? '—',
    data: d.data ?? new Date().toLocaleDateString('pt-BR'),
  };
  return interpolar(template, map);
}

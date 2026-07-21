/**
 * Regras de negócio (RB1–RB6 do PRD), centralizadas para reuso entre
 * web, worker e testes. Funções puras — sem I/O.
 *
 * Observação: `lucro` do negócio e `saldo` do acordo também são calculados no
 * banco (GENERATED column / trigger); estas funções servem para cálculos no
 * cliente (previews, formulários) e para os agregados de dashboard.
 */

export interface NegocioValores {
  valor_venda: number;
  valor_compra: number;
  custos_pagos_cliente: number;
  custos_operacionais: number;
  comissao_terceiros: number;
}

/** RB1 — Lucro por negócio. */
export function lucroNegocio(n: NegocioValores): number {
  return (
    n.valor_venda -
    (n.valor_compra + n.custos_pagos_cliente + n.custos_operacionais + n.comissao_terceiros)
  );
}

/** RB2 — Receita bruta (venda − compra). */
export function receitaBruta(valorVenda: number, valorCompra: number): number {
  return valorVenda - valorCompra;
}

export interface DreEntradas {
  receita_bruta: number;
  custos_pagos_cliente: number;
  custos_operacionais: number;
  comissao_terceiros: number;
  marketing: number;
  folha: number;
  nao_operacional: number;
}

/**
 * RB3 — Lucro líquido do período.
 * Inclui custos_operacionais para reconciliar com o lucro por negócio (RB1) e
 * com o DRE (RF4.1); espelha o cálculo do RPC dre_anual.
 */
export function lucroLiquido(d: DreEntradas): number {
  return (
    d.receita_bruta -
    d.custos_pagos_cliente -
    d.custos_operacionais -
    d.comissao_terceiros -
    d.marketing -
    d.folha -
    d.nao_operacional
  );
}

/** RB4 — Saldo do acordo (valor original − Σ pagamentos). */
export function saldoAcordo(valorOriginal: number, pagamentos: number[]): number {
  const total = pagamentos.reduce((acc, v) => acc + v, 0);
  return valorOriginal - total;
}

/**
 * RB6 — CPL/CPS: custo por lead / custo por venda de um canal.
 * Estados vazios tratados: divisor 0 → null (sem #DIV/0!).
 */
export function cpl(investimento: number, leads: number): number | null {
  return leads > 0 ? investimento / leads : null;
}
export function cps(investimento: number, vendas: number): number | null {
  return vendas > 0 ? investimento / vendas : null;
}

/** Ticket médio, null-safe (RF4.2 / RF5.1). */
export function ticketMedio(faturamento: number, numVendas: number): number | null {
  return numVendas > 0 ? faturamento / numVendas : null;
}

/** Crescimento percentual vs. período anterior, null-safe. */
export function crescimentoPct(atual: number, anterior: number): number | null {
  return anterior !== 0 ? (100 * (atual - anterior)) / Math.abs(anterior) : null;
}

/**
 * RB8 — Elegibilidade de disparo pelo limite do plano.
 * Só dispara se uso atual + destinatários ≤ limite do plano.
 */
export function podeDisparar(
  usoAtual: number,
  destinatarios: number,
  limiteEnviosMes: number,
): boolean {
  return usoAtual + destinatarios <= limiteEnviosMes;
}

export function enviosRestantes(usoAtual: number, limiteEnviosMes: number): number {
  return Math.max(0, limiteEnviosMes - usoAtual);
}

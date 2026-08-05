import { describe, it, expect } from 'vitest';
import {
  lucroNegocio,
  receitaBruta,
  lucroLiquido,
  saldoAcordo,
  cpl,
  cps,
  ticketMedio,
  crescimentoPct,
  podeDisparar,
  enviosRestantes,
} from './regras.js';
import { normalizarTelefoneBR } from './whatsapp.js';

describe('RB1 — lucro por negócio', () => {
  it('calcula venda - (compra + custos cliente + operacionais + comissão)', () => {
    expect(
      lucroNegocio({
        valor_venda: 50000,
        valor_compra: 40000,
        custos_pagos_cliente: 500,
        custos_operacionais: 1000,
        comissao_terceiros: 800,
      }),
    ).toBe(7700);
  });

  it('pode ser negativo (prejuízo)', () => {
    expect(
      lucroNegocio({
        valor_venda: 30000,
        valor_compra: 35000,
        custos_pagos_cliente: 0,
        custos_operacionais: 0,
        comissao_terceiros: 0,
      }),
    ).toBe(-5000);
  });
});

describe('RB2/RB3 — receita bruta e lucro líquido', () => {
  it('receita bruta = venda - compra', () => {
    expect(receitaBruta(50000, 40000)).toBe(10000);
  });

  it('lucro líquido desconta cliente, operacionais, comissão, marketing, folha e não op.', () => {
    expect(
      lucroLiquido({
        receita_bruta: 10000,
        custos_pagos_cliente: 500,
        custos_operacionais: 400,
        comissao_terceiros: 800,
        marketing: 1000,
        folha: 2000,
        nao_operacional: 300,
      }),
    ).toBe(5000);
  });
});

describe('RB4 — saldo do acordo', () => {
  it('valor original - soma dos pagamentos', () => {
    expect(saldoAcordo(10000, [3000, 2000])).toBe(5000);
  });
  it('sem pagamentos mantém o valor original', () => {
    expect(saldoAcordo(10000, [])).toBe(10000);
  });
});

describe('RB6 e estados vazios (sem #DIV/0!)', () => {
  it('cpl/cps retornam null quando divisor é zero', () => {
    expect(cpl(1000, 0)).toBeNull();
    expect(cps(1000, 0)).toBeNull();
    expect(cpl(1000, 10)).toBe(100);
    expect(cps(2000, 4)).toBe(500);
  });
  it('ticket médio e crescimento null-safe', () => {
    expect(ticketMedio(0, 0)).toBeNull();
    expect(ticketMedio(30000, 3)).toBe(10000);
    expect(crescimentoPct(120, 0)).toBeNull();
    expect(crescimentoPct(150, 100)).toBe(50);
  });
});

describe('RB8 — limite de envios', () => {
  it('bloqueia quando ultrapassa o limite', () => {
    expect(podeDisparar(900, 150, 1000)).toBe(false);
    expect(podeDisparar(800, 200, 1000)).toBe(true);
  });
  it('envios restantes nunca negativo', () => {
    expect(enviosRestantes(1200, 1000)).toBe(0);
    expect(enviosRestantes(300, 1000)).toBe(700);
  });
});

describe('normalização de telefone E.164', () => {
  it('aceita variações BR', () => {
    expect(normalizarTelefoneBR('(11) 98888-7777')).toBe('+5511988887777');
    expect(normalizarTelefoneBR('5511988887777')).toBe('+5511988887777');
    expect(normalizarTelefoneBR('11988887777')).toBe('+5511988887777');
  });
  it('rejeita inválidos', () => {
    expect(normalizarTelefoneBR('123')).toBeNull();
  });
});

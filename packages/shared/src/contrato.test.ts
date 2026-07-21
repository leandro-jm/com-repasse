import { describe, it, expect } from 'vitest';
import {
  interpolar,
  montarContrato,
  VARIAVEIS_CONTRATO,
  TEMPLATE_PADRAO_CONTRATO,
  type DadosContrato,
} from './contrato.js';

const base: DadosContrato = {
  vendedor: 'Loja X',
  carro: 'Onix 1.0',
  valor_venda: 50000,
  comprador_nome: 'Fulano',
  data: '01/01/2026',
};

describe('interpolar', () => {
  it('substitui as chaves conhecidas', () => {
    expect(interpolar('Olá {{nome}}!', { nome: 'Fulano' })).toBe('Olá Fulano!');
  });

  it('resolve chave desconhecida para string vazia', () => {
    expect(interpolar('[{{inexistente}}]', {})).toBe('[]');
  });

  it('não casa chave com espaços', () => {
    expect(interpolar('{{ nome }}', { nome: 'Fulano' })).toBe('{{ nome }}');
  });
});

describe('montarContrato', () => {
  it('formata valor, km e ano', () => {
    const r = montarContrato('{{valor_venda}}|{{km}}|{{ano}}', { ...base, km: 1000, ano: 2020 });
    expect(r).toBe(`${(50000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}|1.000 km|2020`);
  });

  it('usa — para os opcionais ausentes', () => {
    expect(montarContrato('{{placa}}|{{cidade}}|{{comprador_doc}}', base)).toBe('—|—|—');
  });

  it('monta a linha do documento só quando há documento', () => {
    expect(montarContrato('{{comprador_doc_linha}}', base)).toBe('');
    expect(montarContrato('{{comprador_doc_linha}}', { ...base, comprador_doc: '123' })).toBe(
      ' (CPF: 123)',
    );
  });

  it('expõe o documento cru além da linha pronta', () => {
    expect(montarContrato('{{comprador_doc}}', { ...base, comprador_doc: '123' })).toBe('123');
  });

  // Guarda anti-drift: VARIAVEIS_CONTRATO é o que a UI mostra a quem escreve o
  // template — toda variável listada precisa existir no map de montarContrato.
  it('resolve todas as variáveis anunciadas', () => {
    const todas = VARIAVEIS_CONTRATO.map((v) => `{{${v}}}`).join('|');
    expect(montarContrato(todas, base)).not.toContain('{{');
  });

  it('resolve todas as variáveis usadas pelo template padrão', () => {
    expect(montarContrato(TEMPLATE_PADRAO_CONTRATO, base)).not.toContain('{{');
  });
});

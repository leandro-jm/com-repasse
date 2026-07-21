import { describe, it, expect } from 'vitest';
import { contatoSchema, negocioSchema, custoSchema, acordoSchema } from './schemas.js';

describe('contatoSchema', () => {
  it('normaliza o telefone para E.164 (BR)', () => {
    const r = contatoSchema.parse({ nome: 'Fulano', telefone: '(11) 98888-7777' });
    expect(r.telefone).toBe('+5511988887777');
  });

  it('remove chaves desconhecidas (defesa contra mass-assignment)', () => {
    const r = contatoSchema.parse({
      nome: 'Fulano',
      telefone: '11988887777',
      tenant_id: 'outro-tenant',
      id: 'forjado',
    } as Record<string, unknown>);
    expect('tenant_id' in r).toBe(false);
    expect('id' in r).toBe(false);
  });

  it('rejeita nome vazio', () => {
    expect(contatoSchema.safeParse({ nome: '', telefone: '11988887777' }).success).toBe(false);
  });
});

describe('negocioSchema', () => {
  it('rejeita data_negocio inválida', () => {
    expect(
      negocioSchema.safeParse({ carro: 'Gol', data_negocio: 'ontem' }).success,
    ).toBe(false);
  });

  it('aceita data ISO e aplica defaults numéricos', () => {
    const r = negocioSchema.parse({ carro: 'Gol', data_negocio: '2026-07-04' });
    expect(r.valor_venda).toBe(0);
    expect(r.status).toBe('em_negociacao');
  });
});

describe('custoSchema', () => {
  it('exige centro_custo_id em formato uuid', () => {
    expect(
      custoSchema.safeParse({ descricao: 'Luz', valor: 100, centro_custo_id: 'nao-uuid' }).success,
    ).toBe(false);
  });
});

describe('acordoSchema', () => {
  it('exige tipo (pagamento/recebimento)', () => {
    expect(acordoSchema.safeParse({ caso: 'Vício oculto' }).success).toBe(false);
    expect(
      acordoSchema.safeParse({ caso: 'Vício oculto', tipo: 'outro' }).success,
    ).toBe(false);
  });

  it('aplica status default aguardando', () => {
    const r = acordoSchema.parse({ caso: 'Vício oculto', tipo: 'pagamento' });
    expect(r.status).toBe('aguardando');
  });

  it('remove codigo_caso enviado pelo cliente (gerado no banco)', () => {
    const r = acordoSchema.parse({
      caso: 'Vício oculto',
      tipo: 'recebimento',
      codigo_caso: 'HACK-9999',
    } as Record<string, unknown>);
    expect('codigo_caso' in r).toBe(false);
  });
});

import { z } from 'zod';
import { normalizarTelefoneBR } from './whatsapp.js';

/** Papéis e enums espelhando os tipos do banco. */
export const PAPEIS = ['owner', 'admin', 'operador', 'financeiro', 'viewer'] as const;
export type Papel = (typeof PAPEIS)[number];

export const STATUS_NEGOCIO = ['em_negociacao', 'vendido', 'entregue', 'problema'] as const;
export const TIPO_CONTATO = ['lojista', 'cliente_final', 'captador'] as const;
export const TIPO_ACORDO = ['pagamento', 'recebimento'] as const;
export const STATUS_ACORDO = [
  'em_pagamento',
  'notificacao_extrajudicial',
  'nao_cumpriu_acordo',
  'aguardando',
  'pago',
] as const;

/** RBAC (RB9): quem pode escrever é todo papel exceto viewer. */
export function podeEscrever(papel: Papel | null | undefined): boolean {
  return !!papel && papel !== 'viewer';
}

/** Somente owner/admin gerenciam configurações do tenant. */
export function ehAdminTenant(papel: Papel | null | undefined): boolean {
  return papel === 'owner' || papel === 'admin';
}

const numeroNaoNegativo = z.coerce.number().min(0).default(0);
const inteiroNaoNegativo = z.coerce.number().int().min(0).default(0);

/** Data ISO (AAAA-MM-DD) — valida formato e existência real da data. */
const dataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00`)), 'Data inválida');

/** Competência mensal (AAAA-MM). */
const competenciaMes = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Competência inválida (use AAAA-MM)');

/** Telefone: normaliza para E.164 (BR) no parse; mantém o valor se não normalizável. */
const telefoneBR = z
  .string()
  .min(8, 'Telefone inválido')
  .transform((v) => normalizarTelefoneBR(v) ?? v);

/** Formulário de negócio (Módulo 1). */
export const negocioSchema = z.object({
  carro: z.string().min(1, 'Informe o carro'),
  placa: z.string().nullish(),
  ano: z.coerce.number().int().min(1900).max(2100).nullish(),
  km: z.coerce.number().int().min(0).nullish(),
  data_negocio: dataISO,
  valor_compra: numeroNaoNegativo,
  custos_pagos_cliente: numeroNaoNegativo,
  valor_venda: numeroNaoNegativo,
  custos_operacionais: numeroNaoNegativo,
  comissao_terceiros: numeroNaoNegativo,
  comprador_id: z.string().uuid().nullish(),
  fonte_id: z.string().uuid().nullish(),
  tipo_documento: z.enum(['procuracao', 'dut']).nullish(),
  ipva_status: z.enum(['pago', 'aberto']).nullish(),
  pneus: z.string().nullish(),
  gastos: z.string().nullish(),
  fipe: z.coerce.number().min(0).nullish(),
  preco_pedido: z.coerce.number().min(0).nullish(),
  status: z.enum(STATUS_NEGOCIO).default('em_negociacao'),
  data_retirada: dataISO.nullish(),
  data_entrega: dataISO.nullish(),
  link_drive: z.string().url().nullish().or(z.literal('')),
  observacoes: z.string().nullish(),
});
export type NegocioForm = z.infer<typeof negocioSchema>;

/** Formulário de contato (Módulo 2). */
export const contatoSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  telefone: telefoneBR,
  tipo: z.enum(TIPO_CONTATO).default('lojista'),
  cidade: z.string().nullish(),
  tags: z.array(z.string()).default([]),
  opt_in_whatsapp: z.boolean().default(false),
  ativo: z.boolean().default(true),
  observacoes: z.string().nullish(),
});
export type ContatoForm = z.infer<typeof contatoSchema>;

/** Lançamento de custo (Módulo 6). */
export const custoSchema = z.object({
  descricao: z.string().min(1, 'Informe a descrição'),
  valor: numeroNaoNegativo,
  centro_custo_id: z.string().uuid('Centro de custo inválido'),
  data_pagamento: dataISO.optional(),
  negocio_id: z.string().uuid().nullish(),
  observacoes: z.string().nullish(),
});
export type CustoForm = z.infer<typeof custoSchema>;

/**
 * Acordo jurídico (Módulo 7). saldo/valor_recuperado_pago são mantidos por trigger.
 * codigo_caso é gerado no banco (BEFORE INSERT) a partir de tipo — não vem do cliente.
 */
export const acordoSchema = z.object({
  caso: z.string().min(1, 'Informe o caso'),
  responsavel: z.string().nullish(),
  tipo: z.enum(TIPO_ACORDO),
  valor_original: numeroNaoNegativo,
  saldo: numeroNaoNegativo,
  status: z.enum(STATUS_ACORDO).default('aguardando'),
  observacoes: z.string().nullish(),
  negocio_id: z.string().uuid().nullish(),
  link_drive: z.string().url().nullish().or(z.literal('')),
});
export type AcordoForm = z.infer<typeof acordoSchema>;

/** Pagamento de acordo (Módulo 7). */
export const pagamentoSchema = z.object({
  valor: numeroNaoNegativo,
  beneficiario: z.string().nullish(),
  data: dataISO.optional(),
  recebido_pago: z.enum(['recebido', 'pago']).default('recebido'),
  observacoes: z.string().nullish(),
});
export type PagamentoForm = z.infer<typeof pagamentoSchema>;

/** Tipo de template de contrato (Módulo 8 — RF8.3). Um padrão por tenant (trigger). */
export const contratoTemplateSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  corpo: z.string().min(1, 'Informe o corpo do template'),
  padrao: z.boolean().default(false),
});
export type ContratoTemplateForm = z.infer<typeof contratoTemplateSchema>;

/** Geração de contrato (Módulo 8). template_id ausente usa o padrão do tenant. */
export const contratoGerarSchema = z.object({
  negocio_id: z.string().uuid('Negócio inválido'),
  template_id: z.string().uuid('Template inválido').nullish(),
  dados_cliente: z.record(z.string()).default({}),
});
export type ContratoGerarForm = z.infer<typeof contratoGerarSchema>;

/** Investimento por canal (Módulo 5 — alimenta CPL/CPS). */
export const investimentoSchema = z.object({
  fonte_id: z.string().uuid().nullish(),
  competencia: competenciaMes,
  investimento: numeroNaoNegativo,
  leads: inteiroNaoNegativo,
  custo_captadora: numeroNaoNegativo,
  observacoes: z.string().nullish(),
});
export type InvestimentoForm = z.infer<typeof investimentoSchema>;

/** Conexão WhatsApp por tenant (tela de admin do tenant). api_key obrigatória. */
export const whatsappConnSchema = z.object({
  provider: z.enum(['evolution', 'cloud_api']).default('evolution'),
  api_url: z.string().url('URL inválida'),
  api_key: z.string().min(1, 'Informe a API key'),
  instance_name: z.string().min(1, 'Informe a instância'),
  numero: z.string().optional(),
});
export type WhatsappConnForm = z.infer<typeof whatsappConnSchema>;

/** Upsert de conexão WhatsApp no servidor: api_key é opcional (só troca se enviada). */
export const whatsappUpsertSchema = z.object({
  provider: z.enum(['evolution', 'cloud_api']).default('evolution'),
  api_url: z.string().url('URL inválida'),
  api_key: z.string().min(1).optional(),
  instance_name: z.string().min(1, 'Informe a instância'),
  numero: z.string().nullish(),
});
export type WhatsappUpsertForm = z.infer<typeof whatsappUpsertSchema>;

/** Atualização de perfil do próprio usuário. */
export const perfilUpdateSchema = z.object({
  nome: z.string().nullish(),
  telefone: z.string().nullish(),
});

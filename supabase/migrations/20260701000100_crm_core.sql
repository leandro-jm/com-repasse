-- =============================================================================
-- Migration 01 — Camada CRM (todas as tabelas com tenant_id + RLS)
-- Módulos 1,2,3,5,6,7,8. RLS habilitado; policies na migration 20.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums (camada CRM)
-- ---------------------------------------------------------------------------
create type tipo_contato   as enum ('lojista', 'cliente_final', 'captador');
create type tipo_fonte     as enum ('pago', 'organico');
create type tipo_documento as enum ('procuracao', 'dut');
create type status_negocio as enum ('em_negociacao', 'vendido', 'entregue', 'problema');
create type ipva_status    as enum ('pago', 'aberto');
create type tipo_campanha  as enum ('novo_carro', 'manual');
create type status_campanha as enum ('rascunho', 'enfileirada', 'enviando', 'concluida', 'falha');
create type status_envio    as enum ('pendente', 'enviado', 'entregue', 'lido', 'falha');
create type tipo_centro     as enum ('operacional', 'nao_operacional');
create type status_acordo    as enum ('aberto', 'quitado');
create type recebido_pago    as enum ('recebido', 'pago');
create type status_contrato   as enum ('rascunho', 'gerado', 'assinado');

-- ---------------------------------------------------------------------------
-- Módulo 2 — contatos (RF2.*)
-- ---------------------------------------------------------------------------
create table contatos (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  nome             text not null,
  telefone         text not null,               -- E.164
  tipo             tipo_contato not null default 'lojista',
  cidade           text,
  tags             text[] not null default '{}',
  opt_in_whatsapp  boolean not null default false,
  ativo            boolean not null default true,
  observacoes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_contatos_tenant on contatos (tenant_id);
create index idx_contatos_elegivel on contatos (tenant_id) where opt_in_whatsapp and ativo;

-- ---------------------------------------------------------------------------
-- Módulo 5 — fontes_lead (RF5.5) — lista controlada por tenant
-- ---------------------------------------------------------------------------
create table fontes_lead (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  nome       text not null,
  tipo       tipo_fonte not null default 'pago',
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_fontes_lead_tenant on fontes_lead (tenant_id);

-- ---------------------------------------------------------------------------
-- Módulo 1 — negocios (RF1.*). lucro é GENERATED (RB1).
-- ---------------------------------------------------------------------------
create table negocios (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id) on delete cascade,
  data_negocio         date not null default current_date,
  carro                text not null,
  placa                text,
  ano                  int,
  km                   int,
  valor_compra         numeric(12, 2) not null default 0,
  custos_pagos_cliente numeric(12, 2) not null default 0,
  valor_venda          numeric(12, 2) not null default 0,
  custos_operacionais  numeric(12, 2) not null default 0,
  comissao_terceiros   numeric(12, 2) not null default 0,
  -- RB1: Venda - (Compra + Custos cliente + Custos operacionais + Comissão)
  lucro numeric(12, 2) generated always as (
    valor_venda - (valor_compra + custos_pagos_cliente + custos_operacionais + comissao_terceiros)
  ) stored,
  comprador_id   uuid references contatos(id) on delete set null,
  fonte_id       uuid references fontes_lead(id) on delete set null,
  tipo_documento tipo_documento,
  ipva_status    ipva_status,
  pneus          text,
  gastos         text,
  fipe           numeric(12, 2),
  preco_pedido   numeric(12, 2),
  status         status_negocio not null default 'em_negociacao',
  data_retirada  date,
  data_entrega   date,
  link_drive     text,
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_negocios_tenant on negocios (tenant_id);
create index idx_negocios_periodo on negocios (tenant_id, data_negocio);
create index idx_negocios_status on negocios (tenant_id, status);
create index idx_negocios_fonte on negocios (tenant_id, fonte_id);

-- ---------------------------------------------------------------------------
-- Módulo 1 — negocio_fotos (RF1.4)
-- ---------------------------------------------------------------------------
create table negocio_fotos (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  url        text not null,
  ordem      int not null default 0,
  is_capa    boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_negocio_fotos_negocio on negocio_fotos (negocio_id);
-- Só uma capa por negócio
create unique index idx_negocio_fotos_capa on negocio_fotos (negocio_id) where is_capa;

-- ---------------------------------------------------------------------------
-- Módulo 3 — campanhas + campanha_envios (RF3.*)
-- ---------------------------------------------------------------------------
create table campanhas (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  negocio_id          uuid references negocios(id) on delete set null,
  tipo                tipo_campanha not null default 'novo_carro',
  template_texto      text not null,
  status              status_campanha not null default 'rascunho',
  total_destinatarios int not null default 0,
  total_enviados      int not null default 0,
  total_falhas        int not null default 0,
  criado_por          uuid references usuarios(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index idx_campanhas_tenant on campanhas (tenant_id);

create table campanha_envios (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  campanha_id uuid not null references campanhas(id) on delete cascade,
  contato_id uuid not null references contatos(id) on delete cascade,
  status     status_envio not null default 'pendente',
  erro       text,
  enviado_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_campanha_envios_tenant on campanha_envios (tenant_id);
create index idx_campanha_envios_campanha on campanha_envios (campanha_id);
-- fila do worker: pendentes por tenant
create index idx_campanha_envios_pendentes on campanha_envios (tenant_id, status) where status = 'pendente';

-- ---------------------------------------------------------------------------
-- Módulo 6 — centros_custo + lancamentos_custo (RF6.*)
-- ---------------------------------------------------------------------------
create table centros_custo (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  nome       text not null,
  tipo       tipo_centro not null default 'operacional',
  created_at timestamptz not null default now()
);
create index idx_centros_custo_tenant on centros_custo (tenant_id);

create table lancamentos_custo (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  data_pagamento date not null default current_date,
  centro_custo_id uuid not null references centros_custo(id) on delete restrict,
  descricao      text not null,
  valor          numeric(12, 2) not null default 0,
  negocio_id     uuid references negocios(id) on delete set null,
  observacoes    text,
  created_at     timestamptz not null default now()
);
create index idx_lancamentos_tenant on lancamentos_custo (tenant_id);
create index idx_lancamentos_periodo on lancamentos_custo (tenant_id, data_pagamento);

-- ---------------------------------------------------------------------------
-- Módulo 7 — acordos + acordo_pagamentos (RF7.*). saldo via trigger (RB4).
-- ---------------------------------------------------------------------------
create table acordos (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  codigo_caso           text,
  caso                  text not null,
  responsavel           text,
  tipo                  text,
  valor_original        numeric(12, 2) not null default 0,
  valor_recuperado_pago numeric(12, 2) not null default 0,
  saldo                 numeric(12, 2) not null default 0,   -- mantido por trigger
  status                status_acordo not null default 'aberto',
  negocio_id            uuid references negocios(id) on delete set null,
  link_drive            text,
  created_at            timestamptz not null default now()
);
create index idx_acordos_tenant on acordos (tenant_id);

create table acordo_pagamentos (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  acordo_id     uuid not null references acordos(id) on delete cascade,
  data          date not null default current_date,
  beneficiario  text,
  valor         numeric(12, 2) not null default 0,
  recebido_pago recebido_pago not null default 'recebido',
  observacoes   text,
  created_at    timestamptz not null default now()
);
create index idx_acordo_pagamentos_acordo on acordo_pagamentos (acordo_id);

-- ---------------------------------------------------------------------------
-- Módulo 8 — contratos (RF8.*)
-- ---------------------------------------------------------------------------
create table contratos (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  negocio_id    uuid not null references negocios(id) on delete cascade,
  template_id   uuid,
  dados_cliente jsonb not null default '{}'::jsonb,
  pdf_url       text,
  status        status_contrato not null default 'rascunho',
  created_at    timestamptz not null default now()
);
create index idx_contratos_tenant on contratos (tenant_id);

-- ---------------------------------------------------------------------------
-- Trigger de saldo de acordo (RB4): saldo = valor_original - Σ pagamentos
-- ---------------------------------------------------------------------------
create or replace function recalc_saldo_acordo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_acordo_id uuid := coalesce(new.acordo_id, old.acordo_id);
  v_total numeric(12,2);
  v_original numeric(12,2);
begin
  select coalesce(sum(valor), 0) into v_total
    from acordo_pagamentos where acordo_id = v_acordo_id;
  select valor_original into v_original from acordos where id = v_acordo_id;
  update acordos
     set valor_recuperado_pago = v_total,
         saldo = v_original - v_total,
         status = case when v_original - v_total <= 0 then 'quitado'::status_acordo
                       else 'aberto'::status_acordo end
   where id = v_acordo_id;
  return null;
end $$;

create trigger trg_recalc_saldo_acordo
  after insert or update or delete on acordo_pagamentos
  for each row execute function recalc_saldo_acordo();

-- Habilita RLS (policies na migration 20)
alter table contatos          enable row level security;
alter table fontes_lead       enable row level security;
alter table negocios          enable row level security;
alter table negocio_fotos     enable row level security;
alter table campanhas         enable row level security;
alter table campanha_envios   enable row level security;
alter table centros_custo     enable row level security;
alter table lancamentos_custo enable row level security;
alter table acordos           enable row level security;
alter table acordo_pagamentos enable row level security;
alter table contratos         enable row level security;

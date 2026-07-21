-- =============================================================================
-- Migration 00 — Camada SaaS (fundação multi-tenant)
-- Tabelas: tenants, usuarios, tenant_usuarios, planos, assinaturas,
--          uso_mensal, whatsapp_instances, audit_log
-- RLS é habilitado aqui, mas as POLICIES ficam na migration 20 (após auth helpers).
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums (camada SaaS)
-- ---------------------------------------------------------------------------
create type papel_tenant as enum ('owner', 'admin', 'operador', 'financeiro', 'viewer');
create type status_assinatura as enum ('trial', 'ativa', 'inadimplente', 'cancelada');
create type provider_whatsapp as enum ('evolution', 'cloud_api');
create type status_instancia as enum ('desconectada', 'conectada', 'banida');

-- ---------------------------------------------------------------------------
-- planos — catálogo de planos com entitlements (RF10.1)
-- ---------------------------------------------------------------------------
create table planos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  preco_mensal    numeric(12, 2) not null default 0,
  limite_usuarios int not null default 3,
  limite_contatos int not null default 100,
  limite_envios_mes int not null default 1000,
  modulos         jsonb not null default '{}'::jsonb,  -- flags de módulos habilitados
  white_label     boolean not null default false,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tenants — organização de cada repassador (RF9.1)
-- ---------------------------------------------------------------------------
create table tenants (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  slug              text not null unique,
  dominio_custom    text unique,
  logo_url          text,
  cor_primaria      text default '#2563eb',
  plano_id          uuid references planos(id),
  status_assinatura status_assinatura not null default 'trial',
  trial_expira_em   timestamptz,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- usuarios — espelho de auth.users com dados de perfil
-- ---------------------------------------------------------------------------
create table usuarios (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  email      text not null,
  telefone   text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tenant_usuarios — associação N:N usuário<->tenant + papel (RF9.2, RF9.3, RF9.4)
-- ---------------------------------------------------------------------------
create table tenant_usuarios (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  papel      papel_tenant not null default 'operador',
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, usuario_id)
);
create index idx_tenant_usuarios_usuario on tenant_usuarios (usuario_id);
create index idx_tenant_usuarios_tenant on tenant_usuarios (tenant_id);

-- ---------------------------------------------------------------------------
-- assinaturas — assinatura por tenant (RF10.2). Gateway abstraído (billing depois).
-- ---------------------------------------------------------------------------
create table assinaturas (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  plano_id                uuid not null references planos(id),
  gateway                 text,                 -- 'asaas'/'iugu'/'pagarme'/null (manual)
  gateway_subscription_id text,
  status                  status_assinatura not null default 'trial',
  periodo_inicio          date,
  periodo_fim             date,
  created_at              timestamptz not null default now()
);
create index idx_assinaturas_tenant on assinaturas (tenant_id);

-- ---------------------------------------------------------------------------
-- uso_mensal — metering de envios por competência (RF10.4, RB8)
-- ---------------------------------------------------------------------------
create table uso_mensal (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  competencia      text not null,               -- 'yyyy-mm'
  envios_whatsapp  int not null default 0,
  unique (tenant_id, competencia)
);

-- ---------------------------------------------------------------------------
-- whatsapp_instances — conexão Evolution POR TENANT (RF3.9, RF11.2)
-- api_key é secreto (cifrado na aplicação/vault); leitura restrita por RLS.
-- ---------------------------------------------------------------------------
create table whatsapp_instances (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  provider      provider_whatsapp not null default 'evolution',
  api_url       text,
  api_key       text,                            -- segredo: cifrar via vault/pgsodium
  instance_name text,                            -- Evolution: instance | Cloud API: waba_id
  numero        text,
  status        status_instancia not null default 'desconectada',
  last_seen     timestamptz,
  created_at    timestamptz not null default now(),
  unique (tenant_id)
);

-- ---------------------------------------------------------------------------
-- audit_log — auditoria de ações sensíveis (RF11.6)
-- ---------------------------------------------------------------------------
create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete set null,
  ator_usuario_id uuid references usuarios(id) on delete set null,
  acao            text not null,
  entidade        text,
  entidade_id     uuid,
  payload         jsonb,
  created_at      timestamptz not null default now()
);
create index idx_audit_log_tenant on audit_log (tenant_id);

-- Habilita RLS (policies definidas na migration 20)
alter table planos             enable row level security;
alter table tenants            enable row level security;
alter table usuarios           enable row level security;
alter table tenant_usuarios    enable row level security;
alter table assinaturas        enable row level security;
alter table uso_mensal         enable row level security;
alter table whatsapp_instances enable row level security;
alter table audit_log          enable row level security;

-- =============================================================================
-- Migration 20260715 — Melhorias no módulo de Acordos (RF7)
--   * tipo_acordo (pagamento/recebimento) reaproveitando a coluna `tipo`
--   * codigo_caso sequencial por tenant + tipo (AP####/AR####)
--   * status com 5 valores; 'pago' automático ao quitar, demais manuais
--   * observacoes no nível do acordo
-- =============================================================================

-- 1) Enum tipo_acordo + conversão da coluna `tipo` (texto livre -> enum)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_acordo') then
    create type tipo_acordo as enum ('pagamento', 'recebimento');
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'acordos' and column_name = 'tipo' and data_type <> 'USER-DEFINED'
  ) then
    alter table acordos alter column tipo type tipo_acordo using (
      case lower(coalesce(tipo, ''))
        when 'pagamento'   then 'pagamento'
        when 'recebimento' then 'recebimento'
        else 'recebimento'          -- legados (indenização/reembolso) -> recebimento
      end::tipo_acordo
    );
  end if;
end $$;

-- 2) observacoes no acordo
alter table acordos add column if not exists observacoes text;

-- 3) Contador sequencial por tenant + tipo
create table if not exists acordo_sequencias (
  tenant_id     uuid not null references tenants(id) on delete cascade,
  tipo          tipo_acordo not null,
  ultimo_numero int not null default 0,
  primary key (tenant_id, tipo)
);
alter table acordo_sequencias enable row level security;
drop policy if exists acordo_sequencias_select on acordo_sequencias;
create policy acordo_sequencias_select on acordo_sequencias for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());
-- Sem policy de escrita: o único writer é o trigger (definer, bypassa RLS).

-- 4) Gerador do codigo_caso (BEFORE INSERT) — só quando codigo_caso é null e há tipo
create or replace function gerar_codigo_caso() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_num     int;
  v_prefixo text;
begin
  if new.codigo_caso is not null or new.tipo is null then
    return new;                      -- respeita código manual; sem tipo não gera
  end if;
  insert into acordo_sequencias (tenant_id, tipo, ultimo_numero)
    values (new.tenant_id, new.tipo, 1)
  on conflict (tenant_id, tipo)
    do update set ultimo_numero = acordo_sequencias.ultimo_numero + 1
  returning ultimo_numero into v_num;
  v_prefixo := case new.tipo when 'pagamento' then 'AP' when 'recebimento' then 'AR' end;
  new.codigo_caso := v_prefixo || lpad(v_num::text, 4, '0');   -- AP0001 / AR0001
  return new;
end $$;

drop trigger if exists trg_gerar_codigo_caso on acordos;
create trigger trg_gerar_codigo_caso
  before insert on acordos
  for each row execute function gerar_codigo_caso();

create unique index if not exists uq_acordos_tenant_codigo
  on acordos (tenant_id, codigo_caso);

-- 5) Novo enum status_acordo (5 valores) via novo tipo + cast
--    (evita a restrição de ALTER TYPE ADD VALUE em transação; remove aberto/quitado)
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'status_acordo' and e.enumlabel = 'aberto'
  ) then
    alter type status_acordo rename to status_acordo_old;
    create type status_acordo as enum (
      'em_pagamento', 'notificacao_extrajudicial',
      'nao_cumpriu_acordo', 'aguardando', 'pago'
    );
    alter table acordos alter column status drop default;
    alter table acordos alter column status type status_acordo using (
      case status::text
        when 'quitado' then 'pago'
        else 'aguardando'           -- 'aberto' -> aguardando
      end::status_acordo
    );
    alter table acordos alter column status set default 'aguardando';
    drop type status_acordo_old;
  end if;
end $$;

-- 6) recalc_saldo_acordo(): mantém saldo/valor; 'pago' automático ao quitar,
--    reverte para 'em_pagamento' se reabrir; NÃO sobrescreve os demais status manuais.
create or replace function recalc_saldo_acordo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_acordo_id uuid := coalesce(new.acordo_id, old.acordo_id);
  v_total     numeric(12,2);
  v_original  numeric(12,2);
begin
  select coalesce(sum(valor), 0) into v_total
    from acordo_pagamentos where acordo_id = v_acordo_id;
  select valor_original into v_original from acordos where id = v_acordo_id;
  update acordos
     set valor_recuperado_pago = v_total,
         saldo = v_original - v_total,
         status = case
           when v_original - v_total <= 0 then 'pago'::status_acordo
           when status = 'pago'           then 'em_pagamento'::status_acordo
           else status
         end
   where id = v_acordo_id;
  return null;
end $$;

-- Recarrega o cache de schema do PostgREST (novas colunas/enum ficam visíveis à API
-- sem depender do restart de containers do CLI). Inofensivo se não houver listener.
notify pgrst, 'reload schema';

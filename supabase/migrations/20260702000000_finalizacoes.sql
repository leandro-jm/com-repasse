-- =============================================================================
-- Migration 50 — Finalização dos itens parciais:
--   * Back-office: override de limite por tenant, impersonation, auditoria
--   * White-label: email remetente (domínio já existe em tenants)
--   * Campanhas: template configurável por tenant (RF3.4)
--   * ROI: investimentos por canal → CPL/CPS/leads/captadora (RF5.1–5.3)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Novas colunas em tenants
-- ---------------------------------------------------------------------------
alter table tenants
  add column if not exists override_limite_envios_mes int,      -- override do plano (RF11.3)
  add column if not exists template_campanha text,              -- template de anúncio (RF3.4)
  add column if not exists email_remetente text;                -- white-label (RF12.2)

-- ---------------------------------------------------------------------------
-- Investimentos por canal (RF5.2/5.3) — base para CPL/CPS e desdobramento OLX
-- ---------------------------------------------------------------------------
create table canal_investimentos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  fonte_id        uuid references fontes_lead(id) on delete set null,
  competencia     text not null,                 -- 'yyyy-mm'
  investimento    numeric(12, 2) not null default 0,
  leads           int not null default 0,
  custo_captadora numeric(12, 2) not null default 0,  -- ex.: captadora OLX
  observacoes     text,
  created_at      timestamptz not null default now(),
  unique (tenant_id, fonte_id, competencia)
);
create index idx_canal_investimentos_tenant on canal_investimentos (tenant_id);
alter table canal_investimentos enable row level security;

create policy canal_investimentos_select on canal_investimentos for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());
create policy canal_investimentos_insert on canal_investimentos for insert to authenticated
  with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());
create policy canal_investimentos_update on canal_investimentos for update to authenticated
  using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin())
  with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());
create policy canal_investimentos_delete on canal_investimentos for delete to authenticated
  using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

-- ---------------------------------------------------------------------------
-- envios_restantes() — considera override do tenant (RF11.3 / RB8)
-- ---------------------------------------------------------------------------
create or replace function envios_restantes()
returns int
language sql
stable
as $$
  select greatest(
    coalesce(t.override_limite_envios_mes, p.limite_envios_mes, 0)
    - coalesce(u.envios_whatsapp, 0),
  0)
  from tenants t
  join planos p on p.id = t.plano_id
  left join uso_mensal u
    on u.tenant_id = t.id and u.competencia = to_char(now(), 'YYYY-MM')
  where t.id = auth_tenant_id();
$$;
grant execute on function envios_restantes() to authenticated;

-- ---------------------------------------------------------------------------
-- roi_por_canal() — agora com leads, investimento, CPL, CPS e custo da captadora
-- ---------------------------------------------------------------------------
drop function if exists roi_por_canal(date, date);
create function roi_por_canal(p_inicio date, p_fim date)
returns table (
  fonte_id         uuid,
  fonte            text,
  num_vendas       bigint,
  lucro_bruto      numeric,
  lucro_liquido    numeric,
  ticket_medio     numeric,
  participacao_pct numeric,
  leads            bigint,
  investimento     numeric,
  custo_captadora  numeric,
  cpl              numeric,
  cps              numeric
)
language sql
stable
as $$
  with vendas as (
    select
      n.fonte_id,
      coalesce(f.nome, 'Sem fonte') as fonte,
      count(*) filter (where n.status in ('vendido','entregue')) as num_vendas,
      coalesce(sum(n.valor_venda - n.valor_compra), 0) as lucro_bruto,
      coalesce(sum(n.lucro), 0) as lucro_liquido,
      coalesce(
        sum(n.valor_venda) filter (where n.status in ('vendido','entregue'))
        / nullif(count(*) filter (where n.status in ('vendido','entregue')), 0),
      0) as ticket_medio,
      coalesce(sum(n.valor_venda), 0) as faturamento
    from negocios n
    left join fontes_lead f on f.id = n.fonte_id
    where n.data_negocio between p_inicio and p_fim
    group by n.fonte_id, f.nome
  ),
  inv as (
    select fonte_id,
      coalesce(sum(investimento), 0) as investimento,
      coalesce(sum(leads), 0) as leads,
      coalesce(sum(custo_captadora), 0) as custo_captadora
    from canal_investimentos
    where competencia between to_char(p_inicio, 'YYYY-MM') and to_char(p_fim, 'YYYY-MM')
    group by fonte_id
  ),
  tot as (select nullif(sum(faturamento), 0) as total from vendas)
  select
    v.fonte_id, v.fonte, v.num_vendas, v.lucro_bruto, v.lucro_liquido, v.ticket_medio,
    round(100 * v.faturamento / t.total, 2) as participacao_pct,
    coalesce(i.leads, 0) as leads,
    coalesce(i.investimento, 0) as investimento,
    coalesce(i.custo_captadora, 0) as custo_captadora,
    round(coalesce(i.investimento, 0) / nullif(i.leads, 0), 2) as cpl,          -- RB6
    round(coalesce(i.investimento, 0) / nullif(v.num_vendas, 0), 2) as cps      -- RB6
  from vendas v
  cross join tot t
  left join inv i on i.fonte_id = v.fonte_id
  order by v.lucro_liquido desc;
$$;
grant execute on function roi_por_canal(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoria (RF11.6) — insere no audit_log com o ator = usuário logado
-- ---------------------------------------------------------------------------
create or replace function registrar_auditoria(
  p_tenant uuid, p_acao text, p_entidade text, p_entidade_id uuid, p_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (tenant_id, ator_usuario_id, acao, entidade, entidade_id, payload)
    values (p_tenant, auth.uid(), p_acao, p_entidade, p_entidade_id, p_payload);
end;
$$;
grant execute on function registrar_auditoria(uuid, text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Impersonation auditada (RF11.5) — super-admin "entra como" um tenant
-- ---------------------------------------------------------------------------
create or replace function impersonar_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'Apenas super-admin pode personificar';
  end if;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('active_tenant_id', p_tenant_id, 'impersonating', true)
   where id = auth.uid();
  insert into audit_log (tenant_id, ator_usuario_id, acao, entidade, entidade_id)
    values (p_tenant_id, auth.uid(), 'impersonate_start', 'tenant', p_tenant_id);
end;
$$;
grant execute on function impersonar_tenant(uuid) to authenticated;

create or replace function parar_impersonacao()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_tenant uuid;
begin
  select (raw_app_meta_data ->> 'active_tenant_id')::uuid into v_tenant
    from auth.users where id = auth.uid();
  update auth.users
     set raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'active_tenant_id' - 'impersonating')
   where id = auth.uid();
  insert into audit_log (tenant_id, ator_usuario_id, acao, entidade, entidade_id)
    values (v_tenant, auth.uid(), 'impersonate_stop', 'tenant', v_tenant);
end;
$$;
grant execute on function parar_impersonacao() to authenticated;

-- ---------------------------------------------------------------------------
-- Auth hook — permite super-admin operar dentro do tenant personificado
-- (papel = owner quando não é membro mas é super-admin com tenant ativo)
-- ---------------------------------------------------------------------------
create or replace function custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims        jsonb;
  uid           uuid;
  active_tenant uuid;
  v_papel       text;
  v_super       boolean;
begin
  uid := (event ->> 'user_id')::uuid;
  claims := coalesce(event -> 'claims', '{}'::jsonb);

  select coalesce((raw_app_meta_data ->> 'is_super_admin')::boolean, false),
         (raw_app_meta_data ->> 'active_tenant_id')::uuid
    into v_super, active_tenant
    from auth.users where id = uid;

  if active_tenant is null then
    select tenant_id into active_tenant
      from public.tenant_usuarios
      where usuario_id = uid and ativo
      order by created_at
      limit 1;
  end if;

  select papel::text into v_papel
    from public.tenant_usuarios
    where usuario_id = uid and tenant_id = active_tenant and ativo;

  if v_papel is null then
    if v_super and active_tenant is not null then
      v_papel := 'owner';               -- impersonation: super-admin opera como owner
    else
      active_tenant := null;
    end if;
  end if;

  claims := jsonb_set(claims, '{tenant_id}', coalesce(to_jsonb(active_tenant), 'null'::jsonb));
  claims := jsonb_set(claims, '{papel}', coalesce(to_jsonb(v_papel), 'null'::jsonb));
  claims := jsonb_set(claims, '{is_super_admin}', to_jsonb(coalesce(v_super, false)));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

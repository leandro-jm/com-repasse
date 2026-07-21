-- =============================================================================
-- Migration 30 — Views e RPC agregadas (Dashboard DRE + ROI) e limites (RB8)
-- Views usam security_invoker => respeitam RLS do chamador (Postgres 15+).
-- Estados vazios tratados com nullif/coalesce (sem #DIV/0! — RF4.4).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Agregado mensal de negócios por tenant (base do DRE — Módulo 4)
-- ---------------------------------------------------------------------------
create view vw_negocios_mensal
with (security_invoker = true) as
select
  tenant_id,
  to_char(data_negocio, 'YYYY-MM')               as competencia,
  count(*)                                        as num_negocios,
  count(*) filter (where status in ('vendido','entregue')) as num_vendas,
  coalesce(sum(valor_compra), 0)                  as custo_compra,
  coalesce(sum(valor_venda), 0)                   as receita_venda,
  coalesce(sum(valor_venda - valor_compra), 0)    as receita_bruta,   -- RB2
  coalesce(sum(custos_pagos_cliente), 0)          as custos_pagos_cliente,
  coalesce(sum(custos_operacionais), 0)           as custos_operacionais,
  coalesce(sum(comissao_terceiros), 0)            as comissao_terceiros,
  coalesce(sum(lucro), 0)                         as lucro,
  coalesce(
    sum(valor_venda) filter (where status in ('vendido','entregue'))
    / nullif(count(*) filter (where status in ('vendido','entregue')), 0),
  0)                                              as ticket_medio
from negocios
group by tenant_id, to_char(data_negocio, 'YYYY-MM');

-- ---------------------------------------------------------------------------
-- Agregado mensal de custos por centro (Módulo 6 -> DRE)
-- ---------------------------------------------------------------------------
create view vw_custos_mensal
with (security_invoker = true) as
select
  l.tenant_id,
  to_char(l.data_pagamento, 'YYYY-MM') as competencia,
  cc.nome                              as centro,
  cc.tipo                              as tipo_centro,
  coalesce(sum(l.valor), 0)            as total
from lancamentos_custo l
join centros_custo cc on cc.id = l.centro_custo_id
group by l.tenant_id, to_char(l.data_pagamento, 'YYYY-MM'), cc.nome, cc.tipo;

-- ---------------------------------------------------------------------------
-- RPC: DRE mensal de um ano (RF4.1–4.4) — 12 competências, com growth
-- ---------------------------------------------------------------------------
create or replace function dre_anual(p_ano int)
returns table (
  competencia          text,
  receita_bruta        numeric,
  custos_pagos_cliente numeric,
  custos_operacionais  numeric,
  comissao_terceiros   numeric,
  marketing            numeric,
  folha                numeric,
  nao_operacional      numeric,
  lucro_liquido        numeric,
  num_vendas           bigint,
  ticket_medio         numeric,
  crescimento_pct      numeric
)
language sql
stable
as $$
  with meses as (
    select to_char(make_date(p_ano, m, 1), 'YYYY-MM') as competencia
    from generate_series(1, 12) as m
  ),
  neg as (
    select * from vw_negocios_mensal
    where competencia like p_ano::text || '-%'
  ),
  cus as (
    select competencia,
      coalesce(sum(total) filter (where centro ilike '%marketing%' or centro ilike '%ads%'), 0) as marketing,
      coalesce(sum(total) filter (where centro ilike '%folha%'), 0) as folha,
      coalesce(sum(total) filter (where tipo_centro = 'nao_operacional'), 0) as nao_operacional
    from vw_custos_mensal
    where competencia like p_ano::text || '-%'
    group by competencia
  ),
  base as (
    select
      me.competencia,
      coalesce(n.receita_bruta, 0)          as receita_bruta,
      coalesce(n.custos_pagos_cliente, 0)   as custos_pagos_cliente,
      coalesce(n.custos_operacionais, 0)    as custos_operacionais,
      coalesce(n.comissao_terceiros, 0)     as comissao_terceiros,
      coalesce(c.marketing, 0)              as marketing,
      coalesce(c.folha, 0)                  as folha,
      coalesce(c.nao_operacional, 0)        as nao_operacional,
      coalesce(n.num_vendas, 0)             as num_vendas,
      coalesce(n.ticket_medio, 0)           as ticket_medio
    from meses me
    left join neg n on n.competencia = me.competencia
    left join cus c on c.competencia = me.competencia
  ),
  calc as (
    select *,
      -- RB3: receita bruta - custos cliente - comissão - marketing - folha - não op.
      (receita_bruta - custos_pagos_cliente - comissao_terceiros
        - marketing - folha - nao_operacional) as lucro_liquido
    from base
  )
  select
    competencia, receita_bruta, custos_pagos_cliente, custos_operacionais,
    comissao_terceiros, marketing, folha, nao_operacional, lucro_liquido,
    num_vendas, ticket_medio,
    round(
      100 * (lucro_liquido - lag(lucro_liquido) over (order by competencia))
      / nullif(abs(lag(lucro_liquido) over (order by competencia)), 0),
    2) as crescimento_pct
  from calc
  order by competencia;
$$;
grant execute on function dre_anual(int) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: ROI por canal/fonte num período (RF5.1, RF5.4)
-- CPS/CPL dependem de investimento por canal (integração futura) -> null-safe.
-- ---------------------------------------------------------------------------
create or replace function roi_por_canal(p_inicio date, p_fim date)
returns table (
  fonte_id            uuid,
  fonte               text,
  num_vendas          bigint,
  lucro_bruto         numeric,
  lucro_liquido       numeric,
  ticket_medio        numeric,
  participacao_pct    numeric
)
language sql
stable
as $$
  with vendas as (
    select
      n.fonte_id,
      coalesce(f.nome, 'Sem fonte')                 as fonte,
      count(*) filter (where n.status in ('vendido','entregue')) as num_vendas,
      coalesce(sum(n.valor_venda - n.valor_compra), 0)          as lucro_bruto,
      coalesce(sum(n.lucro), 0)                                  as lucro_liquido,
      coalesce(
        sum(n.valor_venda) filter (where n.status in ('vendido','entregue'))
        / nullif(count(*) filter (where n.status in ('vendido','entregue')), 0),
      0)                                                         as ticket_medio,
      coalesce(sum(n.valor_venda), 0)                           as faturamento
    from negocios n
    left join fontes_lead f on f.id = n.fonte_id
    where n.data_negocio between p_inicio and p_fim
    group by n.fonte_id, f.nome
  ),
  tot as (select nullif(sum(faturamento), 0) as total from vendas)
  select
    v.fonte_id, v.fonte, v.num_vendas, v.lucro_bruto, v.lucro_liquido, v.ticket_medio,
    round(100 * v.faturamento / t.total, 2) as participacao_pct
  from vendas v cross join tot t
  order by v.lucro_liquido desc;
$$;
grant execute on function roi_por_canal(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Limites de envio (RB8, Módulo 10)
-- ---------------------------------------------------------------------------

-- Consulta enforcement: quantos envios ainda cabem no plano nesta competência
create or replace function envios_restantes()
returns int
language sql
stable
as $$
  select greatest(
    coalesce(p.limite_envios_mes, 0)
    - coalesce(u.envios_whatsapp, 0),
  0)
  from tenants t
  join planos p on p.id = t.plano_id
  left join uso_mensal u
    on u.tenant_id = t.id and u.competencia = to_char(now(), 'YYYY-MM')
  where t.id = auth_tenant_id();
$$;
grant execute on function envios_restantes() to authenticated;

-- true se o disparo cabe no limite do plano (RB8)
create or replace function pode_disparar(p_destinatarios int)
returns boolean
language sql
stable
as $$
  select coalesce(envios_restantes() >= p_destinatarios, false);
$$;
grant execute on function pode_disparar(int) to authenticated;

-- Metering: incrementa uso do mês (chamado pelo worker via service role)
create or replace function registrar_envios(p_tenant uuid, p_qtd int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into uso_mensal (tenant_id, competencia, envios_whatsapp)
    values (p_tenant, to_char(now(), 'YYYY-MM'), p_qtd)
  on conflict (tenant_id, competencia)
    do update set envios_whatsapp = uso_mensal.envios_whatsapp + excluded.envios_whatsapp;
end;
$$;
revoke execute on function registrar_envios(uuid, int) from authenticated, anon, public;

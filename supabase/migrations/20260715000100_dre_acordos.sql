-- =============================================================================
-- Migration 20260715 (b) — DRE: refletir pagamentos de acordos (RF7 -> RF4)
--   Regime de caixa: agrega acordo_pagamentos pela data do pagamento, separando
--   recebimentos (acordo tipo=recebimento, +) de pagamentos (tipo=pagamento, -).
--   lucro_liquido passa a somar recebidos e subtrair pagos, em linhas próprias.
-- =============================================================================

-- View: agregado mensal de acordos por tenant (base do DRE — Módulo 7 -> 4)
create or replace view vw_acordos_mensal
with (security_invoker = true) as
select
  ap.tenant_id,
  to_char(ap.data, 'YYYY-MM')                                       as competencia,
  coalesce(sum(ap.valor) filter (where a.tipo = 'recebimento'), 0)  as acordos_recebidos,
  coalesce(sum(ap.valor) filter (where a.tipo = 'pagamento'), 0)    as acordos_pagos
from acordo_pagamentos ap
join acordos a on a.id = ap.acordo_id
group by ap.tenant_id, to_char(ap.data, 'YYYY-MM');

-- dre_anual: adiciona acordos_recebidos/acordos_pagos e inclui no lucro líquido.
-- Mudança na assinatura de retorno exige DROP antes do CREATE.
drop function if exists dre_anual(int);
create function dre_anual(p_ano int)
returns table (
  competencia          text,
  receita_bruta        numeric,
  custos_pagos_cliente numeric,
  custos_operacionais  numeric,
  comissao_terceiros   numeric,
  marketing            numeric,
  folha                numeric,
  nao_operacional      numeric,
  acordos_recebidos    numeric,
  acordos_pagos        numeric,
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
  acr as (
    select competencia, acordos_recebidos, acordos_pagos
    from vw_acordos_mensal
    where competencia like p_ano::text || '-%'
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
      coalesce(ac.acordos_recebidos, 0)     as acordos_recebidos,
      coalesce(ac.acordos_pagos, 0)         as acordos_pagos,
      coalesce(n.num_vendas, 0)             as num_vendas,
      coalesce(n.ticket_medio, 0)           as ticket_medio
    from meses me
    left join neg n  on n.competencia  = me.competencia
    left join cus c  on c.competencia  = me.competencia
    left join acr ac on ac.competencia = me.competencia
  ),
  calc as (
    select *,
      -- RB3 (ajustada): lucro operacional dos veículos + recebimentos de acordos
      --   - pagamentos de acordos (regime de caixa).
      (receita_bruta - custos_pagos_cliente - custos_operacionais - comissao_terceiros
        - marketing - folha - nao_operacional
        + acordos_recebidos - acordos_pagos) as lucro_liquido
    from base
  )
  select
    competencia, receita_bruta, custos_pagos_cliente, custos_operacionais,
    comissao_terceiros, marketing, folha, nao_operacional,
    acordos_recebidos, acordos_pagos, lucro_liquido,
    num_vendas, ticket_medio,
    round(
      100 * (lucro_liquido - lag(lucro_liquido) over (order by competencia))
      / nullif(abs(lag(lucro_liquido) over (order by competencia)), 0),
    2) as crescimento_pct
  from calc
  order by competencia;
$$;
grant execute on function dre_anual(int) to authenticated;

-- Nova coluna no retorno do RPC -> PostgREST precisa recarregar o schema.
notify pgrst, 'reload schema';

-- =============================================================================
-- Migration 60 — DRE: incluir custos_operacionais no lucro líquido
-- Correção de reconciliação: o lucro por negócio (RB1) já desconta os custos
-- operacionais, mas o lucro líquido do DRE (RB3) os ignorava, de modo que o
-- Dashboard nunca batia com a soma dos lucros por negócio. Alinha com RF4.1
-- (custos operacionais são componente do DRE) e reconcilia os dois números.
-- Redefine apenas o cálculo de lucro_liquido; demais colunas inalteradas.
-- =============================================================================
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
      -- RB3 (ajustada): receita bruta - custos cliente - custos operacionais
      --   - comissão - marketing - folha - não op. (reconcilia com o lucro por negócio)
      (receita_bruta - custos_pagos_cliente - custos_operacionais - comissao_terceiros
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

-- =============================================================================
-- Migration 50 — Correções de bugs
--   1) enforcement do override de limite de envios (RF11.3)
--   2) reserva atômica de uso no enfileiramento (RB8, evita TOCTOU)
--   3) claim atômico de envios no worker (idempotência)
--   4) página pública do carro sem campos internos (gastos/observacoes)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) envios_restantes(): considera tenants.override_limite_envios_mes (RF11.3)
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

-- ---------------------------------------------------------------------------
-- 2) Reserva/estorno atômicos de uso (metering no enfileiramento).
--    O worker NÃO conta mais por envio; a contagem acontece aqui, de forma
--    serializada (SELECT ... FOR UPDATE) para duas campanhas simultâneas não
--    estourarem o limite juntas.
-- ---------------------------------------------------------------------------
create or replace function reservar_envios(p_destinatarios int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := auth_tenant_id();
  v_comp   text := to_char(now(), 'YYYY-MM');
  v_limite int;
  v_uso    int;
begin
  if v_tenant is null or coalesce(p_destinatarios, 0) <= 0 then
    return false;
  end if;

  -- limite efetivo do tenant (override do backoffice tem precedência sobre o plano)
  select coalesce(t.override_limite_envios_mes, p.limite_envios_mes, 0)
    into v_limite
    from tenants t
    join planos p on p.id = t.plano_id
   where t.id = v_tenant;

  -- garante a linha do mês e a trava para serializar reservas concorrentes
  insert into uso_mensal (tenant_id, competencia, envios_whatsapp)
    values (v_tenant, v_comp, 0)
    on conflict (tenant_id, competencia) do nothing;

  select envios_whatsapp
    into v_uso
    from uso_mensal
   where tenant_id = v_tenant and competencia = v_comp
   for update;

  if coalesce(v_uso, 0) + p_destinatarios > coalesce(v_limite, 0) then
    return false;
  end if;

  update uso_mensal
     set envios_whatsapp = envios_whatsapp + p_destinatarios
   where tenant_id = v_tenant and competencia = v_comp;
  return true;
end;
$$;
grant execute on function reservar_envios(int) to authenticated;

create or replace function liberar_envios(p_destinatarios int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := auth_tenant_id();
  v_comp   text := to_char(now(), 'YYYY-MM');
begin
  if v_tenant is null or coalesce(p_destinatarios, 0) <= 0 then
    return;
  end if;
  update uso_mensal
     set envios_whatsapp = greatest(0, envios_whatsapp - p_destinatarios)
   where tenant_id = v_tenant and competencia = v_comp;
end;
$$;
grant execute on function liberar_envios(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Claim de envios: o worker reivindica cada envio antes de disparar.
--    'claimed_at' também permite reprocessar envios "presos" após timeout.
-- ---------------------------------------------------------------------------
alter table campanha_envios add column if not exists claimed_at timestamptz;
create index if not exists idx_campanha_envios_claim
  on campanha_envios (claimed_at) where status = 'pendente';

-- ---------------------------------------------------------------------------
-- 4) carro_publico(): remove 'gastos' e 'observacoes' (dados internos) da
--    resposta pública/anônima da página do carro.
-- ---------------------------------------------------------------------------
create or replace function carro_publico(p_negocio_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'carro', n.carro,
    'ano', n.ano,
    'km', n.km,
    'preco_pedido', n.preco_pedido,
    'fipe', n.fipe,
    'ipva_status', n.ipva_status,
    'pneus', n.pneus,
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object('url', nf.url, 'is_capa', nf.is_capa) order by nf.ordem)
      from negocio_fotos nf where nf.negocio_id = n.id
    ), '[]'::jsonb),
    'tenant', jsonb_build_object(
      'nome', t.nome,
      'logo_url', t.logo_url,
      'cor_primaria', t.cor_primaria
    )
  )
  into v
  from negocios n
  join tenants t on t.id = n.tenant_id
  where n.id = p_negocio_id;

  return v;  -- null se não existir
end;
$$;

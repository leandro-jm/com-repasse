-- =============================================================================
-- Migration 40 — Página pública do carro (RF3.3) + Storage buckets isolados
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC pública: detalhes do carro para a página de campanha (SEM dados pessoais).
-- security definer p/ contornar RLS de leitura, mas retorna apenas campos seguros.
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
    'gastos', n.gastos,
    'observacoes', n.observacoes,
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
grant execute on function carro_publico(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets
--   fotos     — leitura pública (página do carro); escrita isolada por tenant
--   contratos — privado, isolado por tenant
-- Convenção de path: {tenant_id}/{...}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('fotos', 'fotos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('contratos', 'contratos', false)
  on conflict (id) do nothing;

-- fotos: qualquer um lê (bucket público); só membros não-viewer do tenant escrevem
create policy fotos_read on storage.objects for select
  using (bucket_id = 'fotos');

create policy fotos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_can_write()
  );
create policy fotos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_can_write()
  );
create policy fotos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_can_write()
  );

-- contratos: leitura/escrita apenas por membros do tenant dono do path
create policy contratos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
  );
create policy contratos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_can_write()
  );
create policy contratos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_can_write()
  );

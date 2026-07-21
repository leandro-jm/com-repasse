-- =============================================================================
-- Migration 53 — Anexos de acordos (RF7): imagens/PDF/DOC, até 10 por acordo.
-- =============================================================================

create table acordo_anexos (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  acordo_id  uuid not null references acordos(id) on delete cascade,
  nome       text not null,
  path       text not null,          -- caminho no bucket privado 'acordos'
  tipo       text,                   -- mime
  tamanho    bigint,
  created_at timestamptz not null default now()
);
create index idx_acordo_anexos_acordo on acordo_anexos (acordo_id);
alter table acordo_anexos enable row level security;

create policy acordo_anexos_select on acordo_anexos for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());
create policy acordo_anexos_insert on acordo_anexos for insert to authenticated
  with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());
create policy acordo_anexos_delete on acordo_anexos for delete to authenticated
  using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

-- Bucket privado, isolado por tenant (path: {tenant_id}/{acordo_id}/{arquivo})
insert into storage.buckets (id, name, public)
  values ('acordos', 'acordos', false)
  on conflict (id) do nothing;

create policy acordo_anexos_read on storage.objects for select to authenticated
  using (bucket_id = 'acordos' and (storage.foldername(name))[1] = auth_tenant_id()::text);
create policy acordo_anexos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'acordos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_can_write()
  );
create policy acordo_anexos_del on storage.objects for delete to authenticated
  using (
    bucket_id = 'acordos'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_can_write()
  );

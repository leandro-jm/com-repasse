-- =============================================================================
-- Migration — campanha_fotos: fotos da campanha (tela de disparo manual).
-- A campanha passa a ter texto livre + até N fotos próprias (desacoplado do negócio).
-- =============================================================================

create table campanha_fotos (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  campanha_id uuid not null references campanhas(id) on delete cascade,
  url         text not null,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_campanha_fotos_campanha on campanha_fotos (campanha_id);
create index idx_campanha_fotos_tenant on campanha_fotos (tenant_id);

alter table campanha_fotos enable row level security;

-- Policies no padrão da camada CRM (SELECT p/ membro; WRITE p/ não-viewer),
-- espelhando o loop de 20260701000200_rls_and_auth.sql.
create policy campanha_fotos_select on campanha_fotos for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());

create policy campanha_fotos_insert on campanha_fotos for insert to authenticated
  with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

create policy campanha_fotos_update on campanha_fotos for update to authenticated
  using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin())
  with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

create policy campanha_fotos_delete on campanha_fotos for delete to authenticated
  using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

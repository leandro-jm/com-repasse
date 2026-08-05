-- =============================================================================
-- Migration — documentos_comprador: lista controlada por tenant (mesma lógica
-- de fontes_lead, RF5.5) usada no select "Documento do comprador" do negócio.
-- =============================================================================

-- Lista de documentos do comprador (só nome + ativo, sem enum de tipo).
create table documentos_comprador (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  nome       text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_documentos_comprador_tenant on documentos_comprador (tenant_id);

-- FK no negócio (espelha negocios.fonte_id). Mantém o enum tipo_documento intacto.
alter table negocios
  add column documento_comprador_id uuid references documentos_comprador(id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS — mesmo padrão da camada CRM: SELECT p/ membro; WRITE p/ não-viewer.
-- ---------------------------------------------------------------------------
alter table documentos_comprador enable row level security;

create policy documentos_comprador_select on documentos_comprador for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());

create policy documentos_comprador_insert on documentos_comprador for insert to authenticated
  with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

create policy documentos_comprador_update on documentos_comprador for update to authenticated
  using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin())
  with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

create policy documentos_comprador_delete on documentos_comprador for delete to authenticated
  using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());

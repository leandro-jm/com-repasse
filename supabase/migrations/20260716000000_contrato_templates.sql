-- =============================================================================
-- Migration 54 — Múltiplos templates de contrato por tenant (RF8.3)
--   * contrato_templates: CRUD na aba Templates dentro da tela de Contratos
--   * backfill: tenants.template_contrato -> registro "Padrão"
--   * contratos.template_id (órfã desde a 20260701000100) vira FK real
--   * leitura por todo o tenant; escrita só owner/admin
-- =============================================================================

create table if not exists contrato_templates (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  nome       text not null,
  corpo      text not null,
  padrao     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_contrato_templates_tenant on contrato_templates (tenant_id);
create unique index if not exists uq_contrato_templates_tenant_nome
  on contrato_templates (tenant_id, nome);
-- No máximo um padrão por tenant.
create unique index if not exists uq_contrato_templates_padrao
  on contrato_templates (tenant_id) where padrao;

-- Backfill: o template atual de cada tenant vira o "Padrão". Tenant sem template
-- não gera registro — segue no fallback TEMPLATE_PADRAO_CONTRATO do @crm/shared,
-- que é onde o texto padrão vive (copiá-lo para cá duplicaria a constante).
insert into contrato_templates (tenant_id, nome, corpo, padrao)
select id, 'Padrão', template_contrato, true
  from tenants
 where template_contrato is not null
   and btrim(template_contrato) <> ''
on conflict do nothing;

-- Exclusividade do padrão + auto-promoção do primeiro template do tenant.
-- No banco porque o supabase-js não tem transação: promover um novo padrão seriam
-- dois UPDATEs, e falhar no segundo deixaria o tenant sem padrão nenhum.
create or replace function contrato_template_padrao_unico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not exists (
    select 1 from contrato_templates where tenant_id = new.tenant_id
  ) then
    new.padrao := true;
  end if;
  -- roda antes do write da linha, então o índice único parcial nunca vê dois padrões
  if new.padrao then
    update contrato_templates set padrao = false
     where tenant_id = new.tenant_id and id <> new.id and padrao;
  end if;
  return new;
end $$;

drop trigger if exists trg_contrato_template_padrao on contrato_templates;
create trigger trg_contrato_template_padrao
  before insert or update on contrato_templates
  for each row execute function contrato_template_padrao_unico();

-- contratos.template_id: coluna órfã (zero escritas no app) vira FK.
-- on delete set null: o PDF gerado é o artefato de registro — apagar um template
-- não pode apagar contratos (cascade) nem travar a exclusão (restrict).
update contratos set template_id = null where template_id is not null;
alter table contratos drop constraint if exists contratos_template_id_fkey;
alter table contratos add constraint contratos_template_id_fkey
  foreign key (template_id) references contrato_templates(id) on delete set null;
create index if not exists idx_contratos_template on contratos (template_id);

-- RLS: leitura por todo o tenant (todos precisam ler para gerar contrato),
-- escrita restrita a owner/admin.
alter table contrato_templates enable row level security;

drop policy if exists contrato_templates_select on contrato_templates;
create policy contrato_templates_select on contrato_templates for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());

drop policy if exists contrato_templates_insert on contrato_templates;
create policy contrato_templates_insert on contrato_templates for insert to authenticated
  with check ((tenant_id = auth_tenant_id() and auth_is_tenant_admin()) or is_super_admin());

drop policy if exists contrato_templates_update on contrato_templates;
create policy contrato_templates_update on contrato_templates for update to authenticated
  using ((tenant_id = auth_tenant_id() and auth_is_tenant_admin()) or is_super_admin())
  with check ((tenant_id = auth_tenant_id() and auth_is_tenant_admin()) or is_super_admin());

drop policy if exists contrato_templates_delete on contrato_templates;
create policy contrato_templates_delete on contrato_templates for delete to authenticated
  using ((tenant_id = auth_tenant_id() and auth_is_tenant_admin()) or is_super_admin());

-- Mantida nesta fase: o db push roda antes do deploy da API, e o binário antigo
-- ainda faz select desta coluna. Dropar em migration futura, após um release.
comment on column tenants.template_contrato is
  'DEPRECADO (20260716): migrado para contrato_templates. Nenhum código lê. Dropar em migration futura.';

notify pgrst, 'reload schema';

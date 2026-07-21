-- =============================================================================
-- Migration 20 — Auth hook (custom claims) + helpers + RLS policies
-- Isolamento imposto no banco (§7.1, RB7) + RBAC por papel (RB9).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers de claim (lêem o JWT injetado pelo hook)
-- ---------------------------------------------------------------------------
create or replace function auth_tenant_id() returns uuid
  language sql stable as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid;
$$;

create or replace function auth_papel() returns text
  language sql stable as $$
  select auth.jwt() ->> 'papel';
$$;

create or replace function is_super_admin() returns boolean
  language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false);
$$;

-- Escrita permitida a todos os papéis exceto viewer (RB9, baseline)
create or replace function auth_can_write() returns boolean
  language sql stable as $$
  select coalesce(auth.jwt() ->> 'papel', '') not in ('', 'viewer');
$$;

-- Papel de gestão do tenant (owner/admin)
create or replace function auth_is_tenant_admin() returns boolean
  language sql stable as $$
  select coalesce(auth.jwt() ->> 'papel', '') in ('owner', 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Auth hook — injeta tenant_id (ativo), papel e is_super_admin no JWT (§7.2)
-- Tenant ativo vem de auth.users.raw_app_meta_data.active_tenant_id
-- (definido por set_active_tenant); fallback para a 1ª associação.
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

  -- fallback: primeira associação ativa
  if active_tenant is null then
    select tenant_id into active_tenant
      from public.tenant_usuarios
      where usuario_id = uid and ativo
      order by created_at
      limit 1;
  end if;

  -- valida associação e obtém papel no tenant ativo
  select papel::text into v_papel
    from public.tenant_usuarios
    where usuario_id = uid and tenant_id = active_tenant and ativo;

  if v_papel is null then
    active_tenant := null;
  end if;

  claims := jsonb_set(claims, '{tenant_id}', coalesce(to_jsonb(active_tenant), 'null'::jsonb));
  claims := jsonb_set(claims, '{papel}', coalesce(to_jsonb(v_papel), 'null'::jsonb));
  claims := jsonb_set(claims, '{is_super_admin}', to_jsonb(coalesce(v_super, false)));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Permissões do hook (executado pelo supabase_auth_admin)
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.tenant_usuarios to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- policy que deixa o auth admin ler associações durante a emissão do token
create policy auth_admin_read_memberships on tenant_usuarios
  for select to supabase_auth_admin using (true);

-- ---------------------------------------------------------------------------
-- RPC: trocar tenant ativo (RF9.3). Valida associação e grava em app_metadata.
-- O cliente deve chamar refreshSession() em seguida para reemitir o JWT.
-- ---------------------------------------------------------------------------
create or replace function set_active_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if not exists (
    select 1 from tenant_usuarios
     where usuario_id = uid and tenant_id = p_tenant_id and ativo
  ) then
    raise exception 'Usuário não pertence a este tenant';
  end if;

  update auth.users
     set raw_app_meta_data =
       coalesce(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object('active_tenant_id', p_tenant_id)
   where id = uid;
end;
$$;
grant execute on function set_active_tenant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Provisionamento de tenant no signup (RF9.1): cria tenant + owner.
-- ---------------------------------------------------------------------------
create or replace function criar_tenant(p_nome text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  v_tenant  uuid;
  v_plano   uuid;
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;

  select id into v_plano from planos where ativo order by preco_mensal limit 1;

  insert into tenants (nome, slug, plano_id, status_assinatura, trial_expira_em)
    values (p_nome, p_slug, v_plano, 'trial', now() + interval '14 days')
    returning id into v_tenant;

  insert into tenant_usuarios (tenant_id, usuario_id, papel)
    values (v_tenant, uid, 'owner');

  update auth.users
     set raw_app_meta_data =
       coalesce(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object('active_tenant_id', v_tenant)
   where id = uid;

  return v_tenant;
end;
$$;
grant execute on function criar_tenant(text, text) to authenticated;

-- Espelha auth.users -> public.usuarios no signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nome)
    values (new.id, new.email, new.raw_user_meta_data ->> 'nome')
    on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===========================================================================
-- POLICIES — camada SaaS
-- ===========================================================================

-- planos: catálogo legível por todos autenticados; escrita só super-admin
create policy planos_select on planos for select to authenticated using (true);
create policy planos_admin on planos for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- tenants: membro lê seu(s) tenant(s); owner/admin edita; super-admin tudo
create policy tenants_select on tenants for select to authenticated
  using (
    is_super_admin()
    or exists (select 1 from tenant_usuarios tu
               where tu.tenant_id = tenants.id and tu.usuario_id = auth.uid() and tu.ativo)
  );
create policy tenants_update on tenants for update to authenticated
  using (is_super_admin() or (id = auth_tenant_id() and auth_is_tenant_admin()))
  with check (is_super_admin() or (id = auth_tenant_id() and auth_is_tenant_admin()));
create policy tenants_super_all on tenants for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- usuarios: lê a si mesmo e co-membros dos seus tenants; edita a si mesmo
create policy usuarios_select on usuarios for select to authenticated
  using (
    is_super_admin()
    or id = auth.uid()
    or exists (
      select 1 from tenant_usuarios a
      join tenant_usuarios b on a.tenant_id = b.tenant_id
      where a.usuario_id = auth.uid() and b.usuario_id = usuarios.id and a.ativo and b.ativo
    )
  );
create policy usuarios_update_self on usuarios for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- tenant_usuarios: membro lê associações do tenant ativo; owner/admin gerencia
create policy tenant_usuarios_select on tenant_usuarios for select to authenticated
  using (
    is_super_admin()
    or usuario_id = auth.uid()
    or (tenant_id = auth_tenant_id())
  );
create policy tenant_usuarios_manage on tenant_usuarios for all to authenticated
  using (is_super_admin() or (tenant_id = auth_tenant_id() and auth_is_tenant_admin()))
  with check (is_super_admin() or (tenant_id = auth_tenant_id() and auth_is_tenant_admin()));

-- assinaturas: membro do tenant lê; escrita super-admin (billing)
create policy assinaturas_select on assinaturas for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());
create policy assinaturas_super on assinaturas for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- uso_mensal: membro lê (para ver limites); escrita via service role (worker)
create policy uso_mensal_select on uso_mensal for select to authenticated
  using (is_super_admin() or tenant_id = auth_tenant_id());

-- whatsapp_instances: só owner/admin do tenant leem/gerenciam (api_key é secreto)
create policy whatsapp_instances_admin on whatsapp_instances for all to authenticated
  using (is_super_admin() or (tenant_id = auth_tenant_id() and auth_is_tenant_admin()))
  with check (is_super_admin() or (tenant_id = auth_tenant_id() and auth_is_tenant_admin()));

-- audit_log: super-admin e owner/admin do tenant leem; inserção via service role/definer
create policy audit_log_select on audit_log for select to authenticated
  using (is_super_admin() or (tenant_id = auth_tenant_id() and auth_is_tenant_admin()));

-- ===========================================================================
-- POLICIES — camada CRM (padrão: SELECT p/ membro; WRITE p/ não-viewer)
-- ===========================================================================
do $$
declare
  t text;
  crm_tables text[] := array[
    'contatos','fontes_lead','negocios','negocio_fotos','campanhas',
    'campanha_envios','centros_custo','lancamentos_custo','acordos',
    'acordo_pagamentos','contratos'
  ];
begin
  foreach t in array crm_tables loop
    -- SELECT: qualquer membro do tenant ativo (ou super-admin)
    execute format($f$
      create policy %1$s_select on %1$s for select to authenticated
        using (is_super_admin() or tenant_id = auth_tenant_id());
    $f$, t);

    -- INSERT: não-viewer, sempre no tenant ativo
    execute format($f$
      create policy %1$s_insert on %1$s for insert to authenticated
        with check (
          (tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin()
        );
    $f$, t);

    -- UPDATE: não-viewer, dentro do tenant ativo
    execute format($f$
      create policy %1$s_update on %1$s for update to authenticated
        using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin())
        with check ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());
    $f$, t);

    -- DELETE: não-viewer, dentro do tenant ativo
    execute format($f$
      create policy %1$s_delete on %1$s for delete to authenticated
        using ((tenant_id = auth_tenant_id() and auth_can_write()) or is_super_admin());
    $f$, t);
  end loop;
end $$;

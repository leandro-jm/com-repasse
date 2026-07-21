-- =============================================================================
-- Migration 52 — Opt-out de WhatsApp (LGPD): descadastro público por contato
-- =============================================================================
create or replace function optout_contato(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  update contatos set opt_in_whatsapp = false, updated_at = now() where id = p_id;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
grant execute on function optout_contato(uuid) to anon, authenticated;

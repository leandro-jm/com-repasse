-- ---------------------------------------------------------------------------
-- Multi-número WhatsApp: um tenant pode cadastrar N números (whatsapp_instances)
-- e cada campanha escolhe QUAL número usar (1 número por campanha).
--
-- Antes: unique (tenant_id) limitava a 1 número por tenant, e o worker deduzia o
-- número pelo tenant. Agora removemos esse limite e ligamos a campanha ao número.
-- ---------------------------------------------------------------------------

-- permite N números por tenant; evita duplicar o mesmo instance_name no tenant
alter table whatsapp_instances drop constraint if exists whatsapp_instances_tenant_id_key;
alter table whatsapp_instances add column if not exists label text; -- nome amigável (ex.: "Vendas")

create index if not exists idx_whatsapp_instances_tenant on whatsapp_instances (tenant_id);
create unique index if not exists uq_whatsapp_instances_tenant_instance
  on whatsapp_instances (tenant_id, instance_name);

-- default amigável para linhas já existentes
update whatsapp_instances set label = coalesce(label, numero, instance_name);

-- número escolhido pela campanha (1 por campanha). on delete set null: campanha
-- legada (null) ou número apagado cai no fallback do worker sem travar a fila.
alter table campanhas
  add column if not exists whatsapp_instance_id uuid
  references whatsapp_instances(id) on delete set null;

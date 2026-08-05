-- ---------------------------------------------------------------------------
-- Intervalo de envio (throttle) configurável POR TENANT na Conexão WhatsApp.
-- Antes era global via env do worker (CAMPAIGN_THROTTLE_MIN/MAX_MS); agora cada
-- tenant define seu ritmo. Defaults = valores que estavam no worker (4s–12s).
-- O worker espera um tempo aleatório entre min e max entre cada envio (RF3.7).
-- ---------------------------------------------------------------------------
alter table whatsapp_instances
  add column if not exists throttle_min_ms int not null default 4000,
  add column if not exists throttle_max_ms int not null default 12000;

-- min >= 0 e max >= min (jitter válido)
alter table whatsapp_instances
  drop constraint if exists whatsapp_instances_throttle_chk;
alter table whatsapp_instances
  add constraint whatsapp_instances_throttle_chk
  check (throttle_min_ms >= 0 and throttle_max_ms >= throttle_min_ms);

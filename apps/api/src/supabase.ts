import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@crm/shared/database.types';
import { env } from './env.js';

export type DB = SupabaseClient<Database>;

/**
 * Client autenticado COM O JWT DO USUÁRIO: a RLS do banco continua valendo
 * (isolamento por tenant imposto no Postgres). Um client por requisição.
 */
export function userClient(accessToken: string): DB {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client anônimo (rotas públicas: página do carro). */
export function anonClient(): DB {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client service-role (ignora RLS). Uso restrito no backend (ex.: cadastrar usuário). */
export function adminClient(): DB {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado (necessário para cadastrar usuário).');
  }
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@crm/shared/database.types';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no worker.');
}

// Service role: ignora RLS. Usado apenas no backend, nunca exposto ao browser.
export const admin = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

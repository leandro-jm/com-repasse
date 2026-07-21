import './load-env.js';
import { assertEncryptionKeyConfigured } from '@crm/shared/cripto';

assertEncryptionKeyConfigured();

export const env = {
  PORT: Number(process.env.API_PORT ?? 8787),
  SUPABASE_URL: must('SUPABASE_URL'),
  SUPABASE_ANON_KEY: must('SUPABASE_ANON_KEY'),
  // service role é opcional; necessário só para cadastrar usuários (criar no Auth)
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  // base para o link "mais detalhes" da campanha (página pública do carro)
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173',
};

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return v;
}

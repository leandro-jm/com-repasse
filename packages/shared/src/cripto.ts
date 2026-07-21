/**
 * Cifra simétrica (AES-256-GCM) para segredos em repouso (ex.: api_key do WhatsApp).
 * Usa node:crypto — importar SOMENTE no backend/worker (não no browser).
 * A chave vem de APP_ENCRYPTION_KEY (qualquer string; derivada via SHA-256).
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const PREFIX = 'enc:v1:';

function key(): Buffer {
  return createHash('sha256')
    .update(process.env.APP_ENCRYPTION_KEY ?? 'dev-insecure-key')
    .digest();
}

/**
 * Falha cedo (no boot) se a chave de produção não estiver configurada — caso
 * contrário, os segredos em repouso (ex.: api_key do WhatsApp) seriam cifrados
 * com uma constante pública, sem proteção real. Chamar na inicialização.
 */
export function assertEncryptionKeyConfigured(): void {
  if (!process.env.APP_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
    throw new Error(
      'APP_ENCRYPTION_KEY é obrigatória em produção (segredos em repouso ficariam sem proteção).',
    );
  }
}

/** Cifra um texto; retorna string com prefixo enc:v1: (idempotente para valores vazios). */
export function encrypt(plain: string | null | undefined): string | null {
  if (!plain) return plain ?? null;
  if (plain.startsWith(PREFIX)) return plain; // já cifrado
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Decifra; valores sem o prefixo (legado em texto puro) são devolvidos como estão. */
export function decrypt(stored: string | null | undefined): string | null {
  if (!stored) return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored; // compat com dados antigos
  const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}

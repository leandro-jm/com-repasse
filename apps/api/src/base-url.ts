import type { Context } from 'hono';

const stripSlash = (u: string) => u.replace(/\/+$/, '');

/**
 * Base pública do app (scheme://host) para montar links que a pessoa vai
 * acessar de FORA (ex.: página pública do carro na campanha do WhatsApp).
 *
 * Detecta o domínio real automaticamente a partir da requisição do front,
 * então o link funciona seja acessando por localhost em dev ou pelo domínio
 * de produção — sem depender de PUBLIC_APP_URL estar configurado certo.
 * Só cai no `fallback` (env) quando a requisição não traz origem alguma.
 */
export function baseUrlPublica(c: Context, fallback: string): string {
  // 1) Origin do navegador: já é scheme+host do domínio que o usuário está usando.
  const origin = c.req.header('origin');
  if (origin && /^https?:\/\//i.test(origin)) return stripSlash(origin);

  // 2) Atrás de proxy/CDN sem Origin: reconstrói a partir do Host encaminhado.
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host');
  if (host) {
    const proto = (c.req.header('x-forwarded-proto') ?? 'https').split(',')[0].trim();
    return `${proto}://${host}`;
  }

  // 3) Fallback de configuração (PUBLIC_APP_URL).
  return stripSlash(fallback);
}

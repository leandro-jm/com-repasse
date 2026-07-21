import type { ZodTypeAny, infer as ZInfer } from 'zod';

/**
 * Valida um body/params com um schema Zod. Zod remove chaves desconhecidas por
 * padrão, então o retorno é seguro para `insert`/`update` (elimina mass-assignment).
 */
export function validate<S extends ZodTypeAny>(
  schema: S,
  raw: unknown,
): { ok: true; data: ZInfer<S> } | { ok: false; error: string } {
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const error =
    r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ') ||
    'Dados inválidos';
  return { ok: false, error };
}

/**
 * Para PATCH parcial: mantém apenas as chaves que vieram no body cru, evitando
 * que defaults do schema sobrescrevam colunas não enviadas (ex.: zerar valores).
 */
export function somentePresentes<T extends Record<string, unknown>>(
  data: T,
  raw: unknown,
): Partial<T> {
  const out: Partial<T> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of Object.keys(raw)) {
    if (Object.prototype.hasOwnProperty.call(data, k)) out[k as keyof T] = data[k as keyof T];
  }
  return out;
}

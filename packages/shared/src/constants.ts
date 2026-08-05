/** Limites de negócio compartilhados entre front, API e testes. */

/** Máximo de fotos por negócio (RF1.4). */
export const MAX_FOTOS_POR_NEGOCIO = 15;

/** Máximo de fotos por campanha (tela de disparo manual). */
export const MAX_FOTOS_CAMPANHA = 7;

/** Anexos de acordo: máximo de arquivos, tamanho e tipos aceitos. */
export const MAX_ANEXOS_ACORDO = 10;
export const MAX_ANEXO_BYTES = 5 * 1024 * 1024; // 5 MB

/** Tipos aceitos: imagens, PDF e DOC/DOCX. */
export const ANEXO_MIMES_ACEITOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/** Aceite para o input de arquivo no front. */
export const ANEXO_ACCEPT = 'image/*,.pdf,.doc,.docx';

export function anexoTipoValido(mime: string): boolean {
  return (ANEXO_MIMES_ACEITOS as readonly string[]).includes(mime);
}

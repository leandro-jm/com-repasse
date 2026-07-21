import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 50;
const SIZE = 11;
const LINE = SIZE * 1.5;

/**
 * A fonte padrão (Helvetica) usa WinAnsi, que só codifica Latin-1; qualquer
 * caractere fora disso (emoji, símbolos) faz o pdf-lib lançar. Substituímos por
 * '?' para não quebrar a geração (acentos do português estão em Latin-1 e passam).
 */
const sanitizarWinAnsi = (s: string) => s.replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, '?');

/** Gera um PDF A4 simples a partir de texto (quebra de linha/página automática). */
export async function textoParaPdf(entrada: string): Promise<Uint8Array> {
  const texto = sanitizarWinAnsi(entrada);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const maxWidth = A4.w - MARGIN * 2;

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;

  const drawLine = (line: string) => {
    if (y < MARGIN) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - MARGIN;
    }
    page.drawText(line, { x: MARGIN, y, size: SIZE, font, color: rgb(0.1, 0.1, 0.12) });
    y -= LINE;
  };

  for (const paragrafo of texto.split('\n')) {
    if (paragrafo.trim() === '') {
      y -= LINE; // linha em branco
      continue;
    }
    for (const line of wrap(paragrafo, font, maxWidth)) drawLine(line);
  }

  return doc.save();
}

function wrap(text: string, font: import('pdf-lib').PDFFont, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const tentativa = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(tentativa, SIZE) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = tentativa;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

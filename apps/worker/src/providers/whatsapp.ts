/**
 * Abstração de provider de WhatsApp (§7.4 do PRD).
 * Hoje: Evolution API. Amanhã: Cloud API oficial — basta outra implementação.
 */

export interface EnvioParams {
  numero: string; // E.164 (com ou sem +)
  texto: string;
  imagemUrl?: string | null;
}

export interface WhatsAppProvider {
  enviar(p: EnvioParams): Promise<void>;
}

export interface ConexaoInstancia {
  api_url: string;
  api_key: string;
  instance_name: string;
}

/** Implementação para Evolution API (v2). */
export class EvolutionProvider implements WhatsAppProvider {
  constructor(private conn: ConexaoInstancia) {}

  private url(path: string) {
    return `${this.conn.api_url.replace(/\/$/, '')}/${path}/${this.conn.instance_name}`;
  }

  async enviar({ numero, texto, imagemUrl }: EnvioParams): Promise<void> {
    const number = numero.replace(/^\+/, '');
    const endpoint = imagemUrl
      ? this.url('message/sendMedia')
      : this.url('message/sendText');
    const body = imagemUrl
      ? { number, mediatype: 'image', media: imagemUrl, caption: texto }
      : { number, text: texto };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.conn.api_key },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Evolution ${res.status}: ${detail.slice(0, 200)}`);
    }
  }
}

/**
 * Implementação para WhatsApp Cloud API oficial (via BSP).
 * Convenção de campos: api_url = base do Graph (ou vazio p/ padrão),
 * api_key = access token, instance_name = phone_number_id.
 * Obs.: mensagens de marketing exigem TEMPLATE aprovado fora da janela de 24h.
 */
export class CloudApiProvider implements WhatsAppProvider {
  constructor(private conn: ConexaoInstancia) {}

  async enviar({ numero, texto, imagemUrl }: EnvioParams): Promise<void> {
    const base = this.conn.api_url?.replace(/\/$/, '') || 'https://graph.facebook.com/v20.0';
    const to = numero.replace(/^\+/, '');
    const body = imagemUrl
      ? { messaging_product: 'whatsapp', to, type: 'image', image: { link: imagemUrl, caption: texto } }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: texto } };

    const res = await fetch(`${base}/${this.conn.instance_name}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.conn.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Cloud API ${res.status}: ${detail.slice(0, 200)}`);
    }
  }
}

/** Fábrica: escolhe o provider pela config da instância do tenant. */
export function criarProvider(conn: ConexaoInstancia, provider: string): WhatsAppProvider {
  switch (provider) {
    case 'cloud_api':
      return new CloudApiProvider(conn);
    case 'evolution':
    default:
      return new EvolutionProvider(conn);
  }
}

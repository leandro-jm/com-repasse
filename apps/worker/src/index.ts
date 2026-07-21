/**
 * Worker de campanhas WhatsApp (§7.4).
 * - Consome campanha_envios pendentes (todos os tenants) via service role.
 * - Para cada tenant, usa a conexão Evolution do próprio whatsapp_instances.
 * - Reivindica cada envio de forma atômica (idempotência), envia com throttling
 *   aleatório (RF3.7) e registra status por destinatário (RF3.6). O metering do
 *   uso (RB8) é feito na RESERVA do enfileiramento (reservar_envios), não aqui.
 */
import './load-env.js';
import { decrypt, assertEncryptionKeyConfigured } from '@crm/shared/cripto';
import { admin } from './supabase.js';
import { criarProvider, type ConexaoInstancia, type WhatsAppProvider } from './providers/whatsapp.js';

assertEncryptionKeyConfigured();

/** Número de env var com fallback seguro (evita NaN que desligaria o throttle). */
const numEnv = (v: string | undefined, padrao: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
};

const THROTTLE_MIN = numEnv(process.env.CAMPAIGN_THROTTLE_MIN_MS, 4000);
const THROTTLE_MAX = numEnv(process.env.CAMPAIGN_THROTTLE_MAX_MS, 12000);
const APP_URL = (process.env.PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const BATCH = 20;
const IDLE_MS = 5000;
const CLAIM_TIMEOUT_MIN = 5; // reprocessa envios "presos" (claim órfão) após N minutos

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = () => THROTTLE_MIN + Math.floor(Math.random() * Math.max(0, THROTTLE_MAX - THROTTLE_MIN));

// caches por ciclo
const instCache = new Map<string, { provider: WhatsAppProvider; ok: boolean; motivo?: string }>();
const capaCache = new Map<string, string | null>();

async function getProvider(tenantId: string) {
  if (instCache.has(tenantId)) return instCache.get(tenantId)!;
  const { data } = await admin
    .from('whatsapp_instances')
    .select('provider, api_url, api_key, instance_name, status')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  let entry: { provider: WhatsAppProvider; ok: boolean; motivo?: string };
  if (!data || !data.api_url || !data.api_key || !data.instance_name) {
    entry = { provider: null as unknown as WhatsAppProvider, ok: false, motivo: 'Conexão WhatsApp não configurada' };
  } else if (data.status === 'banida') {
    entry = { provider: null as unknown as WhatsAppProvider, ok: false, motivo: 'Instância banida' };
  } else {
    const conn: ConexaoInstancia = {
      api_url: data.api_url,
      api_key: decrypt(data.api_key) ?? data.api_key,
      instance_name: data.instance_name,
    };
    entry = { provider: criarProvider(conn, data.provider), ok: true };
  }
  instCache.set(tenantId, entry);
  return entry;
}

async function getCapa(negocioId: string | null): Promise<string | null> {
  if (!negocioId) return null;
  if (capaCache.has(negocioId)) return capaCache.get(negocioId)!;
  const { data } = await admin
    .from('negocio_fotos')
    .select('url')
    .eq('negocio_id', negocioId)
    .eq('is_capa', true)
    .maybeSingle();
  const url = data?.url ?? null;
  capaCache.set(negocioId, url);
  return url;
}

async function atualizarStatsCampanha(campanhaId: string) {
  const { data } = await admin
    .from('campanha_envios')
    .select('status')
    .eq('campanha_id', campanhaId);
  const rows = data ?? [];
  const enviados = rows.filter((r) => r.status !== 'pendente' && r.status !== 'falha').length;
  const falhas = rows.filter((r) => r.status === 'falha').length;
  const pendentes = rows.filter((r) => r.status === 'pendente').length;
  const { error } = await admin
    .from('campanhas')
    .update({
      total_enviados: enviados,
      total_falhas: falhas,
      status: pendentes === 0 ? 'concluida' : 'enviando',
    })
    .eq('id', campanhaId);
  if (error) console.error(`✗ falha ao atualizar stats da campanha ${campanhaId}:`, error.message);
}

/** Marca um envio, logando (sem lançar) se a escrita falhar. */
async function marcarEnvio(
  id: string,
  patch: { status: 'enviado' | 'falha'; erro?: string | null; enviado_at?: string },
): Promise<void> {
  const { error } = await admin.from('campanha_envios').update(patch).eq('id', id);
  if (error) console.error(`✗ falha ao marcar envio ${id} como ${patch.status}:`, error.message);
}

/**
 * Reivindica um envio de forma atômica: só um worker leva a linha, e envios
 * "presos" (claim órfão de um crash anterior) voltam à fila após CLAIM_TIMEOUT_MIN.
 * Retorna true se este worker deve processar o envio.
 */
async function reivindicar(id: string): Promise<boolean> {
  const limite = new Date(Date.now() - CLAIM_TIMEOUT_MIN * 60_000).toISOString().replace(/\.\d+Z$/, 'Z');
  const { data, error } = await admin
    .from('campanha_envios')
    .update({ claimed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pendente')
    .or(`claimed_at.is.null,claimed_at.lt.${limite}`)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error(`✗ falha ao reivindicar envio ${id}:`, error.message);
    return false;
  }
  return !!data;
}

async function processarLote(): Promise<number> {
  const { data: envios, error } = await admin
    .from('campanha_envios')
    .select('id, tenant_id, campanha_id, contato_id, contatos(telefone), campanhas(template_texto, negocio_id)')
    .eq('status', 'pendente')
    .limit(BATCH);

  if (error) {
    console.error('Erro ao buscar fila:', error.message);
    return 0;
  }
  if (!envios || envios.length === 0) return 0;

  instCache.clear();
  capaCache.clear();
  const campanhasTocadas = new Set<string>();
  let processados = 0;

  for (const e of envios) {
    // claim atômico antes de qualquer envio (evita duplicidade entre ciclos/instâncias)
    if (!(await reivindicar(e.id))) continue;

    campanhasTocadas.add(e.campanha_id);
    processados++;
    const contato = e.contatos as unknown as { telefone: string } | null;
    const campanha = e.campanhas as unknown as { template_texto: string; negocio_id: string | null } | null;

    try {
      // getProvider/decrypt DENTRO do try: uma api_key corrompida/rotacionada vira
      // 'falha' deste envio, sem travar a fila inteira (poison pill).
      const { provider, ok, motivo } = await getProvider(e.tenant_id);
      if (!ok) {
        await marcarEnvio(e.id, { status: 'falha', erro: motivo ?? 'Conexão indisponível' });
        continue;
      }
      if (!contato?.telefone || !campanha) {
        await marcarEnvio(e.id, { status: 'falha', erro: 'Contato/campanha inválidos' });
        continue;
      }
      const imagem = await getCapa(campanha.negocio_id);
      // rodapé de opt-out por destinatário (LGPD)
      const texto = `${campanha.template_texto}\n\n_Para não receber: ${APP_URL}/sair/${e.contato_id}_`;
      await provider.enviar({ numero: contato.telefone, texto, imagemUrl: imagem });
      await marcarEnvio(e.id, { status: 'enviado', enviado_at: new Date().toISOString(), erro: null });
      // metering (RB8) é feito na reserva do enfileiramento (não aqui, para não contar em dobro).
      console.log(`✓ enviado ${contato.telefone} (tenant ${e.tenant_id.slice(0, 8)})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no envio';
      await marcarEnvio(e.id, { status: 'falha', erro: msg });
      console.warn(`✗ falha envio ${e.id}: ${msg}`);
    }

    await sleep(jitter()); // throttling (RF3.7)
  }

  for (const c of campanhasTocadas) await atualizarStatsCampanha(c);
  return processados;
}

async function main() {
  console.log('Worker de campanhas iniciado. Throttle', THROTTLE_MIN, '-', THROTTLE_MAX, 'ms');
  let backoff = IDLE_MS;
  // loop contínuo
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const n = await processarLote();
      backoff = IDLE_MS; // sucesso: zera o backoff
      if (n === 0) await sleep(IDLE_MS);
    } catch (err) {
      console.error('Erro no ciclo:', err);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60_000); // backoff exponencial até 60s
    }
  }
}

main();

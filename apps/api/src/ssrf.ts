import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** IP em faixa interna/perigosa (loopback, privada, link-local/metadata, ULA). */
function ipInterno(ip: string): boolean {
  const versao = isIP(ip);
  if (versao === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // privada
    if (a === 172 && b >= 16 && b <= 31) return true; // privada
    if (a === 192 && b === 168) return true; // privada
    if (a === 169 && b === 254) return true; // link-local / metadata (169.254.169.254)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 0) return true; // "this network"
    return false;
  }
  if (versao === 6) {
    const lo = ip.toLowerCase();
    if (lo === '::1' || lo === '::') return true; // loopback / não especificado
    if (lo.startsWith('fe80')) return true; // link-local
    if (lo.startsWith('fc') || lo.startsWith('fd')) return true; // ULA
    const mapped = lo.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapeado
    if (mapped) return ipInterno(mapped[1]);
    return false;
  }
  return false;
}

/**
 * Valida uma URL de destino para requisições server-side (anti-SSRF): exige
 * http/https e rejeita hosts que resolvem para faixas internas/metadata.
 * Lança Error com mensagem amigável se a URL não for permitida.
 */
export async function assertUrlPublica(urlStr: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error('URL inválida');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Protocolo não permitido (use http/https)');
  }

  const host = url.hostname;
  let enderecos: string[];
  if (isIP(host)) {
    enderecos = [host];
  } else {
    const resolvidos = await lookup(host, { all: true }).catch(() => []);
    if (resolvidos.length === 0) throw new Error('Não foi possível resolver o host de destino');
    enderecos = resolvidos.map((r) => r.address);
  }

  if (enderecos.some(ipInterno)) {
    throw new Error('Host de destino não permitido');
  }
  return url;
}

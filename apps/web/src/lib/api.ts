/**
 * Cliente da API do CRM. O front fala SOMENTE com o backend (Hono);
 * nunca com o Supabase diretamente. Tokens (access/refresh) ficam aqui.
 */
const BASE = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8787';
const STORE = 'crm-auth';

interface Tokens {
  access_token: string;
  refresh_token: string;
}

export const tokens = {
  get(): Tokens | null {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Tokens;
    } catch {
      // storage corrompido: limpa e trata como deslogado (não derruba o app)
      localStorage.removeItem(STORE);
      return null;
    }
  },
  set(t: Tokens) {
    localStorage.setItem(STORE, JSON.stringify(t));
  },
  clear() {
    localStorage.removeItem(STORE);
  },
};

class ApiError extends Error {}

async function raw(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; form?: FormData } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.auth !== false) {
    const t = tokens.get();
    if (t) headers.Authorization = `Bearer ${t.access_token}`;
  }
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  return fetch(`${BASE}${path}`, { method: opts.method ?? 'GET', headers, body });
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; form?: FormData } = {},
): Promise<T> {
  let res = await raw(path, opts);

  // tenta renovar o token uma vez em caso de 401
  if (res.status === 401 && opts.auth !== false) {
    const ok = await tryRefresh();
    if (ok) res = await raw(path, opts);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  // trata 200 com corpo vazio sem lançar SyntaxError
  const text = await res.text();
  return (text ? (JSON.parse(text) as T) : (undefined as T));
}

// single-flight: várias 401 concorrentes compartilham UM refresh (o Supabase
// rotaciona o refresh_token; sem isso, as perdedoras invalidariam o token novo).
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const t = tokens.get();
  if (!t) return false;
  const res = await raw('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: t.refresh_token },
    auth: false,
  });
  if (!res.ok) {
    tokens.clear();
    return false;
  }
  const data = (await res.json().catch(() => null)) as Tokens | null;
  if (!data?.access_token || !data?.refresh_token) {
    tokens.clear();
    return false;
  }
  tokens.set({ access_token: data.access_token, refresh_token: data.refresh_token });
  return true;
}

export interface Membership {
  tenant_id: string;
  papel: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string | null;
}
export interface Me {
  user: { id: string; email?: string };
  claims: { tenant_id: string | null; papel: string | null; is_super_admin: boolean };
  memberships: Membership[];
  impersonating: Membership | null;
}

export const api = {
  auth: {
    async signup(email: string, password: string, nome: string) {
      return request('/auth/signup', { method: 'POST', body: { email, password, nome }, auth: false });
    },
    async login(email: string, password: string) {
      const data = await request<Tokens>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      tokens.set({ access_token: data.access_token, refresh_token: data.refresh_token });
      return data;
    },
    async logout() {
      await request('/auth/logout', { method: 'POST' }).catch(() => {});
      tokens.clear();
    },
    me: () => request<Me>('/auth/me'),
    refresh: tryRefresh,
  },

  tenants: {
    create: (nome: string, slug: string) =>
      request<{ tenant_id: string }>('/tenants', { method: 'POST', body: { nome, slug } }),
    switch: async (tenant_id: string) => {
      await request('/tenants/switch', { method: 'POST', body: { tenant_id } });
      await tryRefresh(); // reemite JWT com novo tenant ativo
    },
    config: <T>() => request<T>('/tenants/config'),
    update: (patch: Record<string, unknown>) =>
      request('/tenants', { method: 'PATCH', body: patch }),
  },

  perfil: {
    get: <T>() => request<T>('/perfil'),
    update: (body: { nome?: string; telefone?: string }) =>
      request('/perfil', { method: 'PATCH', body }),
    trocarSenha: (senha_atual: string, nova_senha: string) =>
      request('/perfil/senha', { method: 'POST', body: { senha_atual, nova_senha } }),
  },

  membros: {
    list: <T>() => request<T>('/membros'),
    cadastrar: (body: { email: string; nome?: string; senha: string; papel: string }) =>
      request<{ ok: boolean; usuario_id: string; criado: boolean }>('/membros', {
        method: 'POST',
        body,
      }),
    setPapel: (usuarioId: string, papel: string) =>
      request(`/membros/${usuarioId}`, { method: 'PATCH', body: { papel } }),
    remover: (usuarioId: string) => request(`/membros/${usuarioId}`, { method: 'DELETE' }),
  },

  negocios: {
    list: <T>() => request<T>('/negocios'),
    create: <T>(body: unknown) => request<T>('/negocios', { method: 'POST', body }),
    update: (id: string, body: unknown) => request(`/negocios/${id}`, { method: 'PATCH', body }),
    remover: (id: string) => request(`/negocios/${id}`, { method: 'DELETE' }),
    fotos: <T>(id: string) => request<T>(`/negocios/${id}/fotos`),
    fontes: <T>() => request<T>('/negocios/meta/fontes'),
    fontesTodas: <T>() => request<T>('/negocios/meta/fontes/todas'),
    criarFonte: <T>(body: unknown) =>
      request<T>('/negocios/meta/fontes', { method: 'POST', body }),
    atualizarFonte: (id: string, body: unknown) =>
      request(`/negocios/meta/fontes/${id}`, { method: 'PATCH', body }),
    documentos: <T>() => request<T>('/negocios/meta/documentos'),
    documentosTodos: <T>() => request<T>('/negocios/meta/documentos/todas'),
    criarDocumento: <T>(body: unknown) =>
      request<T>('/negocios/meta/documentos', { method: 'POST', body }),
    atualizarDocumento: (id: string, body: unknown) =>
      request(`/negocios/meta/documentos/${id}`, { method: 'PATCH', body }),
  },

  contatos: {
    list: <T>() => request<T>('/contatos'),
    grupos: <T>() => request<T>('/contatos/meta/grupos'),
    create: (body: unknown) => request('/contatos', { method: 'POST', body }),
    update: (id: string, body: unknown) => request(`/contatos/${id}`, { method: 'PATCH', body }),
    remover: (id: string) => request(`/contatos/${id}`, { method: 'DELETE' }),
    bulk: (contatos: unknown[]) =>
      request<{ inserted: number }>('/contatos/bulk', { method: 'POST', body: { contatos } }),
  },

  campanhas: {
    list: <T>() => request<T>('/campanhas'),
    envios: <T>(id: string) => request<T>(`/campanhas/${id}/envios`),
    criar: (body: { texto: string }) =>
      request<{ id: string }>('/campanhas', { method: 'POST', body }),
    enviar: (id: string, body: { instance_id: string; grupo?: string | null }) =>
      request<{ ok: boolean; total: number }>(`/campanhas/${id}/enviar`, { method: 'POST', body }),
  },

  financeiro: {
    dre: <T>(ano: number) => request<T>(`/financeiro/dashboard/dre?ano=${ano}`),
    dreDetalhe: <T>(competencia: string) =>
      request<T>(`/financeiro/dashboard/dre/${competencia}/detalhe`),
    roi: <T>(inicio: string, fim: string) =>
      request<T>(`/financeiro/roi?inicio=${inicio}&fim=${fim}`),
    centros: <T>() => request<T>('/financeiro/custos/centros'),
    custos: <T>() => request<T>('/financeiro/custos'),
    criarCusto: (body: unknown) => request('/financeiro/custos', { method: 'POST', body }),
    removerCusto: (id: string) => request(`/financeiro/custos/${id}`, { method: 'DELETE' }),
    acordos: <T>() => request<T>('/financeiro/acordos'),
    criarAcordo: (body: unknown) => request('/financeiro/acordos', { method: 'POST', body }),
    atualizarAcordo: (id: string, body: unknown) =>
      request(`/financeiro/acordos/${id}`, { method: 'PATCH', body }),
    removerAcordo: (id: string) => request(`/financeiro/acordos/${id}`, { method: 'DELETE' }),
    pagamentos: <T>(id: string) => request<T>(`/financeiro/acordos/${id}/pagamentos`),
    addPagamento: (id: string, body: unknown) =>
      request(`/financeiro/acordos/${id}/pagamentos`, { method: 'POST', body }),
    anexos: <T>(id: string) => request<T>(`/financeiro/acordos/${id}/anexos`),
    uploadAnexos: (id: string, files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append('arquivos', f));
      return request<{ anexos: unknown[] }>(`/financeiro/acordos/${id}/anexos`, {
        method: 'POST',
        form,
      });
    },
    downloadAnexo: (anexoId: string) =>
      request<{ url: string }>(`/financeiro/anexos/${anexoId}/download`),
    removerAnexo: (anexoId: string) =>
      request(`/financeiro/anexos/${anexoId}`, { method: 'DELETE' }),
    investimentos: <T>() => request<T>('/financeiro/investimentos'),
    salvarInvestimento: (body: unknown) =>
      request('/financeiro/investimentos', { method: 'POST', body }),
  },

  contratos: {
    list: <T>(negocioId?: string) =>
      request<T>(`/contratos${negocioId ? `?negocio_id=${negocioId}` : ''}`),
    gerar: (body: {
      negocio_id: string;
      template_id?: string | null;
      dados_cliente: Record<string, string>;
    }) =>
      request<{ ok: boolean; contrato_id: string; url: string | null }>('/contratos', {
        method: 'POST',
        body,
      }),
    download: (id: string) => request<{ url: string }>(`/contratos/${id}/download`),
    remover: (id: string) => request(`/contratos/${id}`, { method: 'DELETE' }),
    templates: {
      list: <T>() => request<T>('/contratos/templates'),
      create: (body: unknown) => request('/contratos/templates', { method: 'POST', body }),
      update: (id: string, body: unknown) =>
        request(`/contratos/templates/${id}`, { method: 'PATCH', body }),
      remover: (id: string) => request(`/contratos/templates/${id}`, { method: 'DELETE' }),
    },
  },

  whatsapp: {
    list: <T>() => request<T>('/whatsapp'),
    criar: (body: unknown) => request<{ id: string }>('/whatsapp', { method: 'POST', body }),
    atualizar: (id: string, body: unknown) =>
      request(`/whatsapp/${id}`, { method: 'PATCH', body }),
    remover: (id: string) => request(`/whatsapp/${id}`, { method: 'DELETE' }),
    status: (id: string) =>
      request<{ status: string; state?: string }>(`/whatsapp/${id}/status`),
  },

  billing: {
    get: <T>() => request<T>('/billing'),
    assinar: (plano_id: string) =>
      request<{ ok: boolean; status: string; checkout_url: string | null }>('/billing/assinar', {
        method: 'POST',
        body: { plano_id },
      }),
  },

  backoffice: {
    overview: <T>() => request<T>('/backoffice/overview'),
    setStatus: (id: string, status: string) =>
      request(`/backoffice/tenants/${id}/status`, { method: 'PATCH', body: { status } }),
    setLimite: (id: string, override_limite_envios_mes: number | null) =>
      request(`/backoffice/tenants/${id}/limite`, {
        method: 'PATCH',
        body: { override_limite_envios_mes },
      }),
    impersonate: async (tenant_id: string) => {
      await request('/backoffice/impersonate', { method: 'POST', body: { tenant_id } });
      await tryRefresh();
    },
    stopImpersonate: async () => {
      await request('/backoffice/impersonate/stop', { method: 'POST' });
      await tryRefresh();
    },
    audit: <T>() => request<T>('/backoffice/audit'),
  },

  storage: {
    uploadFotos: (negocioId: string, files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append('fotos', f));
      return request<{ fotos: unknown[] }>(`/storage/negocios/${negocioId}/fotos`, {
        method: 'POST',
        form,
      });
    },
    uploadFotosCampanha: (campanhaId: string, files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append('fotos', f));
      return request<{ fotos: unknown[] }>(`/storage/campanhas/${campanhaId}/fotos`, {
        method: 'POST',
        form,
      });
    },
  },

  publico: {
    carro: <T>(id: string) => request<T>(`/public/carro/${id}`, { auth: false }),
    optout: (contatoId: string) =>
      request<{ ok: boolean }>(`/public/optout/${contatoId}`, { method: 'POST', auth: false }),
  },
};

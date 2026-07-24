import { Hono } from 'hono';
import {
  MAX_ANEXOS_ACORDO,
  MAX_ANEXO_BYTES,
  anexoTipoValido,
  acordoSchema,
  custoSchema,
  investimentoSchema,
  pagamentoSchema,
} from '@crm/shared';
import {
  requireAuth,
  requireTenantAtivo,
  requirePapel,
  type AuthEnv,
} from '../middleware/auth.js';
import { validate, somentePresentes } from '../validate.js';

export const financeiroRoutes = new Hono<AuthEnv>();

// Atualização de acordo: tipo (fonte da sigla do código) e saldo (mantido por trigger)
// são imutáveis por aqui; status/observacoes/etc. são editáveis.
const acordoUpdateSchema = acordoSchema.omit({ tipo: true, saldo: true }).partial();
// Dados financeiros (DRE, custos, acordos) restritos a owner/admin/financeiro (RBAC).
financeiroRoutes.use(
  '*',
  requireAuth,
  requireTenantAtivo,
  requirePapel(['owner', 'admin', 'financeiro']),
);

const tid = (c: { get: (k: 'claims') => { tenant_id: string | null } }) => c.get('claims').tenant_id!;

/** Confirma que o acordo existe no tenant ativo (RLS filtra); 404 caso contrário. */
async function acordoDoTenant(
  db: import('../supabase.js').DB,
  acordoId: string,
): Promise<boolean> {
  const { data } = await db.from('acordos').select('id').eq('id', acordoId).maybeSingle();
  return !!data;
}

const dataRe = /^\d{4}-\d{2}-\d{2}$/;

// Dashboard DRE anual (RF4.*)
financeiroRoutes.get('/dashboard/dre', async (c) => {
  const ano = Number(c.req.query('ano') ?? new Date().getFullYear());
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2100)
    return c.json({ error: 'Ano inválido' }, 400);
  const { data, error } = await c.get('db').rpc('dre_anual', { p_ano: ano });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

const competenciaRe = /^\d{4}-\d{2}$/;

// Detalhe de um mês da DRE: negócios e lançamentos de custo que compõem o mês.
// Negócios pela data_negocio, custos pela data_pagamento — as mesmas colunas que o
// RPC dre_anual agrega, para o detalhe reconciliar com os totais da tabela.
financeiroRoutes.get('/dashboard/dre/:competencia/detalhe', async (c) => {
  const comp = c.req.param('competencia');
  if (!competenciaRe.test(comp)) return c.json({ error: 'Competência inválida' }, 400);
  const [ano, mes] = comp.split('-').map(Number);
  const inicio = `${comp}-01`;
  const prox =
    mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  const db = c.get('db');

  const negocios = await db
    .from('negocios')
    .select(
      'id, carro, placa, status, data_negocio, valor_venda, valor_compra, custos_pagos_cliente, custos_operacionais, comissao_terceiros, lucro',
    )
    .gte('data_negocio', inicio)
    .lt('data_negocio', prox)
    .order('data_negocio', { ascending: false });
  if (negocios.error) return c.json({ error: negocios.error.message }, 400);

  const custos = await db
    .from('lancamentos_custo')
    .select('id, descricao, valor, data_pagamento, negocio_id, centros_custo(nome, tipo)')
    .gte('data_pagamento', inicio)
    .lt('data_pagamento', prox)
    .order('data_pagamento', { ascending: false });
  if (custos.error) return c.json({ error: custos.error.message }, 400);

  // Pagamentos de acordo do mês (regime de caixa, pela data do pagamento) — o
  // acordo define o sinal no DRE: recebimento (+), pagamento (-).
  const acordos = await db
    .from('acordo_pagamentos')
    .select('id, data, valor, beneficiario, observacoes, acordos(codigo_caso, caso, tipo)')
    .gte('data', inicio)
    .lt('data', prox)
    .order('data', { ascending: false });
  if (acordos.error) return c.json({ error: acordos.error.message }, 400);

  return c.json({ negocios: negocios.data, custos: custos.data, acordos: acordos.data });
});

// ROI por canal (RF5.*)
financeiroRoutes.get('/roi', async (c) => {
  const inicio = c.req.query('inicio') ?? '';
  const fim = c.req.query('fim') ?? '';
  if (!dataRe.test(inicio) || !dataRe.test(fim))
    return c.json({ error: 'Informe início e fim no formato AAAA-MM-DD' }, 400);
  const { data, error } = await c.get('db').rpc('roi_por_canal', { p_inicio: inicio, p_fim: fim });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// Investimentos por canal (RF5.2/5.3) — alimentam CPL/CPS
financeiroRoutes.get('/investimentos', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('canal_investimentos')
    .select('*, fontes_lead(nome)')
    .order('competencia', { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

financeiroRoutes.post('/investimentos', async (c) => {
  const v = validate(investimentoSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { error } = await c
    .get('db')
    .from('canal_investimentos')
    .upsert({ ...v.data, tenant_id: tid(c) }, { onConflict: 'tenant_id,fonte_id,competencia' });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---- Custos (Módulo 6) ----
financeiroRoutes.get('/custos/centros', async (c) => {
  const { data, error } = await c.get('db').from('centros_custo').select('id, nome, tipo').order('nome');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

financeiroRoutes.get('/custos', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('lancamentos_custo')
    .select('*, centros_custo(nome)')
    .order('data_pagamento', { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

financeiroRoutes.post('/custos', async (c) => {
  const v = validate(custoSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { error } = await c
    .get('db')
    .from('lancamentos_custo')
    .insert({ ...v.data, tenant_id: tid(c) });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// exclusão definitiva de um lançamento de custo (sem filhos; select-primeiro p/ 404 real)
financeiroRoutes.delete('/custos/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const { data: l } = await db.from('lancamentos_custo').select('id').eq('id', id).maybeSingle();
  if (!l) return c.json({ error: 'Lançamento não encontrado' }, 404);
  const { error } = await db.from('lancamentos_custo').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---- Acordos (Módulo 7) ----
financeiroRoutes.get('/acordos', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('acordos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

financeiroRoutes.post('/acordos', async (c) => {
  const v = validate(acordoSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { error } = await c.get('db').from('acordos').insert({ ...v.data, tenant_id: tid(c) });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

financeiroRoutes.patch('/acordos/:id', async (c) => {
  const id = c.req.param('id');
  if (!(await acordoDoTenant(c.get('db'), id)))
    return c.json({ error: 'Acordo não encontrado' }, 404);
  const raw = await c.req.json().catch(() => null);
  const v = validate(acordoUpdateSchema, raw);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const patch = somentePresentes(v.data, raw);
  const { error } = await c.get('db').from('acordos').update(patch).eq('id', id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// exclusão definitiva de um acordo. FK cascade apaga pagamentos e anexos (linhas);
// os arquivos dos anexos ficariam órfãos no bucket — limpamos antes (padrão do DELETE /anexos).
financeiroRoutes.delete('/acordos/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  if (!(await acordoDoTenant(db, id))) return c.json({ error: 'Acordo não encontrado' }, 404);
  const { data: anexos } = await db.from('acordo_anexos').select('path').eq('acordo_id', id);
  const paths = (anexos ?? [])
    .map((a) => a.path as string | null)
    .filter((p): p is string => Boolean(p));
  if (paths.length) await db.storage.from('acordos').remove(paths);
  const { error } = await db.from('acordos').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

financeiroRoutes.get('/acordos/:id/pagamentos', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('acordo_pagamentos')
    .select('*')
    .eq('acordo_id', c.req.param('id'))
    .order('data');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

financeiroRoutes.post('/acordos/:id/pagamentos', async (c) => {
  const acordoId = c.req.param('id');
  if (!(await acordoDoTenant(c.get('db'), acordoId)))
    return c.json({ error: 'Acordo não encontrado' }, 404);
  const v = validate(pagamentoSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { error } = await c
    .get('db')
    .from('acordo_pagamentos')
    .insert({ ...v.data, acordo_id: acordoId, tenant_id: tid(c) });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---- Anexos de acordo (imagens/PDF/DOC, até 10, 5 MB cada) ----
financeiroRoutes.get('/acordos/:id/anexos', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('acordo_anexos')
    .select('id, nome, tipo, tamanho, created_at')
    .eq('acordo_id', c.req.param('id'))
    .order('created_at');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

financeiroRoutes.post('/acordos/:id/anexos', async (c) => {
  const db = c.get('db');
  const tenantId = tid(c);
  const acordoId = c.req.param('id');
  if (!(await acordoDoTenant(db, acordoId)))
    return c.json({ error: 'Acordo não encontrado' }, 404);

  const form = await c.req.formData();
  const files = form.getAll('arquivos').filter((f): f is File => f instanceof File);
  if (files.length === 0) return c.json({ error: 'Nenhum arquivo enviado' }, 400);

  const { count } = await db
    .from('acordo_anexos')
    .select('id', { count: 'exact', head: true })
    .eq('acordo_id', acordoId);
  const base = count ?? 0;
  if (base + files.length > MAX_ANEXOS_ACORDO) {
    return c.json(
      { error: `Máximo de ${MAX_ANEXOS_ACORDO} anexos por acordo. Já existem ${base}.` },
      422,
    );
  }
  for (const f of files) {
    if (f.size > MAX_ANEXO_BYTES) return c.json({ error: `"${f.name}" excede 5 MB` }, 422);
    if (!anexoTipoValido(f.type)) {
      return c.json({ error: `Tipo não permitido em "${f.name}" (só imagem, PDF ou DOC)` }, 422);
    }
  }

  const criados = [];
  for (const f of files) {
    const safe = f.name.replace(/[^\w.-]/g, '_');
    const path = `${tenantId}/${acordoId}/${Date.now()}-${safe}`;
    const buf = new Uint8Array(await f.arrayBuffer());
    const up = await db.storage.from('acordos').upload(path, buf, {
      contentType: f.type || 'application/octet-stream',
    });
    if (up.error) return c.json({ error: up.error.message }, 400);
    const { data: row, error } = await db
      .from('acordo_anexos')
      .insert({ tenant_id: tenantId, acordo_id: acordoId, nome: f.name, path, tipo: f.type, tamanho: f.size })
      .select('id, nome, tipo, tamanho, created_at')
      .single();
    if (error) return c.json({ error: error.message }, 400);
    criados.push(row);
  }
  return c.json({ anexos: criados });
});

financeiroRoutes.get('/anexos/:anexoId/download', async (c) => {
  const { data: anexo, error } = await c
    .get('db')
    .from('acordo_anexos')
    .select('path')
    .eq('id', c.req.param('anexoId'))
    .single();
  if (error || !anexo) return c.json({ error: 'Anexo não encontrado' }, 404);
  const { data: signed, error: sErr } = await c
    .get('db')
    .storage.from('acordos')
    .createSignedUrl(anexo.path, 600);
  if (sErr) return c.json({ error: sErr.message }, 400);
  return c.json({ url: signed.signedUrl });
});

financeiroRoutes.delete('/anexos/:anexoId', async (c) => {
  const db = c.get('db');
  const anexoId = c.req.param('anexoId');
  const { data: anexo, error: selErr } = await db
    .from('acordo_anexos')
    .select('path')
    .eq('id', anexoId)
    .maybeSingle();
  if (selErr) return c.json({ error: selErr.message }, 400);
  if (!anexo) return c.json({ error: 'Anexo não encontrado' }, 404);
  if (anexo.path) await db.storage.from('acordos').remove([anexo.path]);
  const { error } = await db.from('acordo_anexos').delete().eq('id', anexoId);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

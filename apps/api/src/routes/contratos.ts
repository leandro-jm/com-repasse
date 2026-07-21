import { Hono } from 'hono';
import {
  contratoGerarSchema,
  contratoTemplateSchema,
  montarContrato,
  TEMPLATE_PADRAO_CONTRATO,
  type DadosContrato,
} from '@crm/shared';
import {
  requireAuth,
  requireTenantAdmin,
  requireTenantAtivo,
  type AuthEnv,
} from '../middleware/auth.js';
import { textoParaPdf } from '../pdf.js';
import { validate, somentePresentes } from '../validate.js';

export const contratoRoutes = new Hono<AuthEnv>();
contratoRoutes.use('*', requireAuth, requireTenantAtivo);

const tid = (c: { get: (k: 'claims') => { tenant_id: string | null } }) => c.get('claims').tenant_id!;

/** Erro do índice único (tenant, nome) vira mensagem de usuário. */
function erroTemplate(e: { code?: string; message: string }): string {
  return e.code === '23505' ? 'Já existe um template com esse nome' : e.message;
}

// ---------------------------------------------------------------------------
// Tipos de template (RF8.3) — declarados antes de /:id/download para não serem
// capturados por ele. Escrita só owner/admin: a RLS não erra em update/delete
// bloqueado, apenas afeta zero linhas — sem o middleware a API mentiria "ok".
// ---------------------------------------------------------------------------

const templateUpdateSchema = contratoTemplateSchema.partial();

contratoRoutes.get('/templates', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('contrato_templates')
    .select('id, nome, corpo, padrao, created_at')
    .order('created_at', { ascending: true });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

contratoRoutes.post('/templates', requireTenantAdmin, async (c) => {
  const v = validate(contratoTemplateSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { data, error } = await c
    .get('db')
    .from('contrato_templates')
    .insert({ ...v.data, tenant_id: tid(c) })
    .select('id, nome, corpo, padrao, created_at')
    .single();
  if (error) return c.json({ error: erroTemplate(error) }, 400);
  return c.json(data);
});

contratoRoutes.patch('/templates/:id', requireTenantAdmin, async (c) => {
  const raw = await c.req.json().catch(() => null);
  const v = validate(templateUpdateSchema, raw);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const patch = somentePresentes(v.data, raw);
  const { error } = await c
    .get('db')
    .from('contrato_templates')
    .update(patch)
    .eq('id', c.req.param('id'));
  if (error) return c.json({ error: erroTemplate(error) }, 400);
  return c.json({ ok: true });
});

contratoRoutes.delete('/templates/:id', requireTenantAdmin, async (c) => {
  const { error } = await c
    .get('db')
    .from('contrato_templates')
    .delete()
    .eq('id', c.req.param('id'));
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// lista contratos de um negócio
contratoRoutes.get('/', async (c) => {
  const negocioId = c.req.query('negocio_id');
  let q = c
    .get('db')
    .from('contratos')
    .select('id, negocio_id, dados_cliente, pdf_url, status, created_at')
    .order('created_at', { ascending: false });
  if (negocioId) q = q.eq('negocio_id', negocioId);
  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// gera contrato pré-preenchido em PDF e armazena (RF8.1/8.2/8.4)
contratoRoutes.post('/', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('claims').tenant_id!;
  const v = validate(contratoGerarSchema, await c.req.json().catch(() => null));
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { negocio_id, template_id, dados_cliente } = v.data;

  const { data: negocio, error: nErr } = await db
    .from('negocios')
    .select('carro, placa, ano, km, valor_venda')
    .eq('id', negocio_id)
    .single();
  if (nErr || !negocio) return c.json({ error: 'Negócio não encontrado' }, 404);

  // template escolhido > padrão do tenant > modelo embutido do @crm/shared
  let template: { id: string; corpo: string } | null = null;
  if (template_id) {
    const { data } = await db
      .from('contrato_templates')
      .select('id, corpo')
      .eq('id', template_id)
      .maybeSingle();
    // some por RLS se for de outro tenant — não caia calado no padrão
    if (!data) return c.json({ error: 'Template não encontrado' }, 404);
    template = data;
  } else {
    const { data } = await db
      .from('contrato_templates')
      .select('id, corpo')
      .eq('padrao', true)
      .maybeSingle();
    template = data; // tenant sem padrão é estado normal
  }

  const { data: tenant } = await db.from('tenants').select('nome').eq('id', tenantId).single();

  const dc = dados_cliente as Record<string, string>;
  const dados: DadosContrato = {
    vendedor: tenant?.nome ?? '',
    vendedor_doc: dc.vendedor_doc ?? null,
    carro: negocio.carro,
    placa: negocio.placa,
    ano: negocio.ano,
    km: negocio.km,
    valor_venda: Number(negocio.valor_venda),
    comprador_nome: dc.comprador_nome ?? '',
    comprador_doc: dc.comprador_doc ?? null,
    comprador_endereco: dc.comprador_endereco ?? null,
    cidade: dc.cidade ?? null,
  };
  // || e não ??: corpo vazio geraria um PDF em branco
  const texto = montarContrato(template?.corpo || TEMPLATE_PADRAO_CONTRATO, dados);

  // cria o registro primeiro para ter o id no caminho do arquivo
  const { data: contrato, error: cErr } = await db
    .from('contratos')
    .insert({
      tenant_id: tenantId,
      negocio_id,
      // grava o padrão resolvido, não só o escolhido no form: é a proveniência do PDF
      template_id: template?.id ?? null,
      dados_cliente: dc,
      status: 'rascunho',
    })
    .select('id')
    .single();
  if (cErr || !contrato) return c.json({ error: cErr?.message ?? 'Falha ao criar contrato' }, 400);

  const path = `${tenantId}/${negocio_id}/${contrato.id}.pdf`;
  try {
    const pdf = await textoParaPdf(texto);
    const up = await db.storage.from('contratos').upload(path, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (up.error) throw new Error(up.error.message);
    const { error: updErr } = await db
      .from('contratos')
      .update({ pdf_url: path, status: 'gerado' })
      .eq('id', contrato.id);
    if (updErr) throw new Error(updErr.message);
  } catch (e) {
    // não deixa o registro 'rascunho' órfão se o PDF/upload/atualização falhar
    await db.from('contratos').delete().eq('id', contrato.id);
    return c.json({ error: e instanceof Error ? e.message : 'Falha ao gerar o PDF' }, 400);
  }

  const { data: signed } = await db.storage.from('contratos').createSignedUrl(path, 600);
  return c.json({ ok: true, contrato_id: contrato.id, url: signed?.signedUrl ?? null });
});

// link assinado para baixar o PDF (bucket privado)
contratoRoutes.get('/:id/download', async (c) => {
  const { data: contrato, error } = await c
    .get('db')
    .from('contratos')
    .select('pdf_url')
    .eq('id', c.req.param('id'))
    .single();
  if (error || !contrato?.pdf_url) return c.json({ error: 'Contrato não encontrado' }, 404);
  const { data: signed, error: sErr } = await c
    .get('db')
    .storage.from('contratos')
    .createSignedUrl(contrato.pdf_url, 600);
  if (sErr) return c.json({ error: sErr.message }, 400);
  return c.json({ url: signed.signedUrl });
});

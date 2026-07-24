import { Hono } from 'hono';
import {
  montarMensagem,
  linkCarroPublico,
  TEMPLATE_PADRAO_ANUNCIO,
  type DadosAnuncio,
} from '@crm/shared';
import { requireAuth, requireTenantAtivo, type AuthEnv } from '../middleware/auth.js';
import { env } from '../env.js';

export const campanhaRoutes = new Hono<AuthEnv>();
campanhaRoutes.use('*', requireAuth, requireTenantAtivo);

const tid = (c: { get: (k: 'claims') => { tenant_id: string | null; sub: string } }) =>
  c.get('claims');

campanhaRoutes.get('/', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('campanhas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

campanhaRoutes.get('/:id/envios', async (c) => {
  const { data, error } = await c
    .get('db')
    .from('campanha_envios')
    .select('id, status, erro, enviado_at, contatos(nome, telefone)')
    .eq('campanha_id', c.req.param('id'))
    .order('created_at');
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

/**
 * Cria campanha de "novo carro" e enfileira envios (RF3.1).
 * Elegibilidade opt-in+ativo (RB5) e enforcement de limite do plano (RB8).
 */
campanhaRoutes.post('/novo-carro', async (c) => {
  const db = c.get('db');
  const { tenant_id, sub } = tid(c);
  const body = (await c.req.json()) as {
    negocio_id: string;
    dados: DadosAnuncio;
    template?: string | null;
    grupo?: string | null;
  };

  // elegíveis (opt-in + ativo); se um grupo for informado, filtra pela tag (@>)
  let q = db.from('contatos').select('id').eq('opt_in_whatsapp', true).eq('ativo', true);
  if (body.grupo) q = q.contains('tags', [body.grupo]);
  const { data: contatos, error: cErr } = await q;
  if (cErr) return c.json({ error: cErr.message }, 400);
  if (!contatos || contatos.length === 0)
    return c.json(
      {
        error: body.grupo
          ? `Nenhum contato elegível (opt-in + ativo) no grupo "${body.grupo}".`
          : 'Nenhum contato elegível (opt-in + ativo).',
      },
      422,
    );

  // Reserva atômica do uso (RB8): evita corrida de duas campanhas simultâneas
  // passarem no limite. O metering acontece AQUI (não mais no worker).
  const { data: reservou, error: pErr } = await db.rpc('reservar_envios', {
    p_destinatarios: contatos.length,
  });
  if (pErr) return c.json({ error: pErr.message }, 400);
  if (!reservou)
    return c.json(
      { error: `Limite de envios do plano seria excedido (${contatos.length} destinatários).` },
      422,
    );

  // libera a reserva se algo abaixo falhar
  const liberar = () => db.rpc('liberar_envios', { p_destinatarios: contatos.length });

  // template: usa o informado > o configurado no tenant (RF3.4) > o padrão
  let template = body.template || null;
  if (!template) {
    const { data: t } = await db
      .from('tenants')
      .select('template_campanha')
      .eq('id', tenant_id!)
      .single();
    template = t?.template_campanha || null;
  }
  template = template || TEMPLATE_PADRAO_ANUNCIO;
  const link = linkCarroPublico(env.PUBLIC_APP_URL, body.negocio_id);
  const texto = montarMensagem(template, body.dados, link);

  const { data: camp, error: campErr } = await db
    .from('campanhas')
    .insert({
      tenant_id: tenant_id!,
      negocio_id: body.negocio_id,
      tipo: 'novo_carro',
      template_texto: texto,
      status: 'enfileirada',
      total_destinatarios: contatos.length,
      criado_por: sub,
    })
    .select('id')
    .single();
  if (campErr || !camp) {
    await liberar();
    return c.json({ error: campErr?.message ?? 'Falha ao criar campanha' }, 400);
  }

  const envios = contatos.map((ct) => ({
    tenant_id: tenant_id!,
    campanha_id: camp.id,
    contato_id: ct.id,
    status: 'pendente' as const,
  }));
  const { error: eErr } = await db.from('campanha_envios').insert(envios);
  if (eErr) {
    await db.from('campanhas').delete().eq('id', camp.id);
    await liberar();
    return c.json({ error: eErr.message }, 400);
  }

  return c.json({ ok: true, campanha_id: camp.id, total: contatos.length });
});

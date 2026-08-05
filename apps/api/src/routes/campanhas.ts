import { Hono } from 'hono';
import { campanhaEnviarSchema } from '@crm/shared';
import { requireAuth, requireTenantAtivo, type AuthEnv } from '../middleware/auth.js';
import { validate } from '../validate.js';

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
 * Cria a campanha (rascunho) com o texto livre. As fotos são enviadas depois
 * (POST /storage/campanhas/:id/fotos) e o disparo em POST /:id/enviar.
 */
campanhaRoutes.post('/', async (c) => {
  const db = c.get('db');
  const { tenant_id, sub } = tid(c);
  const body = (await c.req.json().catch(() => ({}))) as { texto?: string };
  const texto = (body.texto ?? '').trim();
  if (!texto) return c.json({ error: 'Informe o texto da campanha.' }, 400);

  const { data: camp, error } = await db
    .from('campanhas')
    .insert({
      tenant_id: tenant_id!,
      tipo: 'manual',
      template_texto: texto,
      status: 'rascunho',
      criado_por: sub,
    })
    .select('id')
    .single();
  if (error || !camp) return c.json({ error: error?.message ?? 'Falha ao criar campanha' }, 400);
  return c.json({ id: camp.id });
});

/**
 * Enfileira os envios da campanha (RF3.1). Elegibilidade opt-in+ativo (RB5),
 * filtro opcional por grupo (tag) e enforcement de limite do plano (RB8).
 */
campanhaRoutes.post('/:id/enviar', async (c) => {
  const db = c.get('db');
  const { tenant_id } = tid(c);
  const campanhaId = c.req.param('id');
  const v = validate(campanhaEnviarSchema, await c.req.json().catch(() => ({})));
  if (!v.ok) return c.json({ error: v.error }, 422);
  const { instance_id, grupo } = v.data;

  // a campanha precisa existir e ser do tenant ativo (RLS filtra o select)
  const { data: camp } = await db
    .from('campanhas')
    .select('id, status')
    .eq('id', campanhaId)
    .maybeSingle();
  if (!camp) return c.json({ error: 'Campanha não encontrada' }, 404);
  if (camp.status !== 'rascunho')
    return c.json({ error: 'Esta campanha já foi enfileirada.' }, 422);

  // o número escolhido precisa existir (RLS escopa o tenant) e não estar banido.
  // O pareamento é feito por fora (Evolution), então não exigimos status 'conectada'.
  const { data: inst } = await db
    .from('whatsapp_instances')
    .select('id, status')
    .eq('id', instance_id)
    .maybeSingle();
  if (!inst) return c.json({ error: 'Número de WhatsApp não encontrado.' }, 422);
  if (inst.status === 'banida')
    return c.json({ error: 'O número escolhido está banido.' }, 422);

  // elegíveis (opt-in + ativo); se um grupo for informado, filtra pela tag (@>)
  let q = db.from('contatos').select('id').eq('opt_in_whatsapp', true).eq('ativo', true);
  if (grupo) q = q.contains('tags', [grupo]);
  const { data: contatos, error: cErr } = await q;
  if (cErr) return c.json({ error: cErr.message }, 400);
  if (!contatos || contatos.length === 0)
    return c.json(
      {
        error: grupo
          ? `Nenhum contato elegível (opt-in + ativo) no grupo "${grupo}".`
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

  const { error: upErr } = await db
    .from('campanhas')
    .update({
      status: 'enfileirada',
      total_destinatarios: contatos.length,
      whatsapp_instance_id: instance_id,
    })
    .eq('id', campanhaId);
  if (upErr) {
    await liberar();
    return c.json({ error: upErr.message }, 400);
  }

  const envios = contatos.map((ct) => ({
    tenant_id: tenant_id!,
    campanha_id: campanhaId,
    contato_id: ct.id,
    status: 'pendente' as const,
  }));
  const { error: eErr } = await db.from('campanha_envios').insert(envios);
  if (eErr) {
    await db.from('campanhas').update({ status: 'rascunho', total_destinatarios: 0 }).eq('id', campanhaId);
    await liberar();
    return c.json({ error: eErr.message }, 400);
  }

  return c.json({ ok: true, total: contatos.length });
});

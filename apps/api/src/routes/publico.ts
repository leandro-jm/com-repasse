import { Hono } from 'hono';
import { anonClient } from '../supabase.js';

export const publicoRoutes = new Hono();

// Página pública do carro (RF3.3) — sem auth, sem dados pessoais.
publicoRoutes.get('/carro/:id', async (c) => {
  const { data, error } = await anonClient()
    .rpc('carro_publico', { p_negocio_id: c.req.param('id') })
    .returns<unknown>();
  if (error) return c.json({ error: error.message }, 400);
  if (!data) return c.json({ error: 'Anúncio não encontrado' }, 404);
  return c.json(data);
});

// Opt-out de WhatsApp (LGPD) — descadastro público por contato
publicoRoutes.post('/optout/:contatoId', async (c) => {
  const { data, error } = await anonClient().rpc('optout_contato', {
    p_id: c.req.param('contatoId'),
  });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: !!data });
});

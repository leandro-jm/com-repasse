import { Hono } from 'hono';
import { MAX_FOTOS_POR_NEGOCIO } from '@crm/shared';
import { requireAuth, requireTenantAtivo, type AuthEnv } from '../middleware/auth.js';

export const storageRoutes = new Hono<AuthEnv>();
storageRoutes.use('*', requireAuth, requireTenantAtivo);

/**
 * Upload de fotos de um negócio (RF1.4). Recebe multipart e envia ao Storage
 * usando o client do usuário — a RLS de storage.objects valida o path por tenant.
 * A 1ª foto vira capa. Retorna as fotos criadas.
 */
storageRoutes.post('/negocios/:id/fotos', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('claims').tenant_id!;
  const negocioId = c.req.param('id');

  // garante que o negócio pai pertence ao tenant ativo (RLS filtra o select)
  const { data: negocio } = await db
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .maybeSingle();
  if (!negocio) return c.json({ error: 'Negócio não encontrado' }, 404);

  const form = await c.req.formData();
  const files = form.getAll('fotos').filter((f): f is File => f instanceof File);
  if (files.length === 0) return c.json({ error: 'Nenhum arquivo enviado' }, 400);

  // ordem inicial após as fotos já existentes
  const { count } = await db
    .from('negocio_fotos')
    .select('id', { count: 'exact', head: true })
    .eq('negocio_id', negocioId);
  const base = count ?? 0;

  // limite de fotos por negócio (RF1.4)
  if (base + files.length > MAX_FOTOS_POR_NEGOCIO) {
    return c.json(
      {
        error: `Máximo de ${MAX_FOTOS_POR_NEGOCIO} fotos por negócio. Já existem ${base}; você pode enviar mais ${Math.max(0, MAX_FOTOS_POR_NEGOCIO - base)}.`,
      },
      422,
    );
  }

  const criadas = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safe = file.name.replace(/[^\w.-]/g, '_');
    const path = `${tenantId}/${negocioId}/${Date.now()}-${i}-${safe}`;
    const buf = new Uint8Array(await file.arrayBuffer());

    const up = await db.storage.from('fotos').upload(path, buf, {
      contentType: file.type || 'image/jpeg',
    });
    if (up.error) return c.json({ error: up.error.message }, 400);

    const { data: pub } = db.storage.from('fotos').getPublicUrl(path);
    const { data: row, error } = await db
      .from('negocio_fotos')
      .insert({
        tenant_id: tenantId,
        negocio_id: negocioId,
        url: pub.publicUrl,
        ordem: base + i,
        is_capa: base + i === 0,
      })
      .select('*')
      .single();
    if (error) return c.json({ error: error.message }, 400);
    criadas.push(row);
  }

  return c.json({ fotos: criadas });
});

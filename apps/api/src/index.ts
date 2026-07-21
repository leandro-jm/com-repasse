import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './env.js';
import { authRoutes } from './routes/auth.js';
import { tenantRoutes } from './routes/tenants.js';
import { membroRoutes } from './routes/membros.js';
import { perfilRoutes } from './routes/perfil.js';
import { negocioRoutes } from './routes/negocios.js';
import { contatoRoutes } from './routes/contatos.js';
import { campanhaRoutes } from './routes/campanhas.js';
import { financeiroRoutes } from './routes/financeiro.js';
import { contratoRoutes } from './routes/contratos.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { backofficeRoutes } from './routes/backoffice.js';
import { billingRoutes } from './routes/billing.js';
import { storageRoutes } from './routes/storage.js';
import { publicoRoutes } from './routes/publico.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'crm-api' }));

app.route('/auth', authRoutes);
app.route('/public', publicoRoutes);
app.route('/tenants', tenantRoutes);
app.route('/membros', membroRoutes);
app.route('/perfil', perfilRoutes);
app.route('/negocios', negocioRoutes);
app.route('/contatos', contatoRoutes);
app.route('/campanhas', campanhaRoutes);
app.route('/financeiro', financeiroRoutes);
app.route('/contratos', contratoRoutes);
app.route('/whatsapp', whatsappRoutes);
app.route('/backoffice', backofficeRoutes);
app.route('/billing', billingRoutes);
app.route('/storage', storageRoutes);

app.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404));
app.onError((err, c) => {
  console.error('Erro:', err);
  return c.json({ error: 'Erro interno' }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API CRM rodando em http://localhost:${info.port}`);
});

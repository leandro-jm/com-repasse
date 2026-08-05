-- =============================================================================
-- Seed — dados mockados para TODAS as funcionalidades atuais.
-- Aplicado por `supabase db reset`.
--
-- LOGINS (senha de todos: senha123):
--   daniel@carvalho.test      -> owner      (Carvalho Júnior)
--   operador@carvalho.test    -> operador   (Carvalho Júnior)
--   financeiro@carvalho.test  -> financeiro (Carvalho Júnior)
--   admin@eradigital.test     -> super-admin da plataforma (back-office)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Planos (RF10.1)
-- -----------------------------------------------------------------------------
insert into planos (id, nome, preco_mensal, limite_usuarios, limite_contatos, limite_envios_mes, modulos, white_label, ativo) values
  ('11111111-1111-1111-1111-111111111111', 'Starter', 99.00,  3,  150,  1000,
    '{"negocios":true,"contatos":true,"campanhas":true,"dashboard":false,"roi":false,"acordos":false,"contratos":false}'::jsonb, false, true),
  ('22222222-2222-2222-2222-222222222222', 'Pro',    249.00,  8,  500,  5000,
    '{"negocios":true,"contatos":true,"campanhas":true,"dashboard":true,"roi":true,"acordos":true,"contratos":true}'::jsonb, false, true),
  ('33333333-3333-3333-3333-333333333333', 'Agência',599.00, 25, 2000, 20000,
    '{"negocios":true,"contatos":true,"campanhas":true,"dashboard":true,"roi":true,"acordos":true,"contratos":true}'::jsonb, true, true)
on conflict (id) do nothing;

-- Tenant-piloto Carvalho Júnior + um 2º tenant (para provar isolamento)
insert into tenants (id, nome, slug, plano_id, status_assinatura, trial_expira_em, cor_primaria) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Carvalho Júnior', 'carvalho-junior',
   '22222222-2222-2222-2222-222222222222', 'ativa', now() + interval '365 days', '#0f766e'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Repasse Silva', 'repasse-silva',
   '11111111-1111-1111-1111-111111111111', 'trial', now() + interval '14 days', '#7c3aed')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Usuários de autenticação (auth.users) + identities. senha123 (bcrypt).
-- O trigger handle_new_user cria automaticamente public.usuarios.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'daniel@carvalho.test', extensions.crypt('senha123', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"],"active_tenant_id":"aaaaaaaa-0000-0000-0000-000000000000"}'::jsonb,
   '{"nome":"Daniel Carvalho"}'::jsonb, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000002','authenticated','authenticated',
   'operador@carvalho.test', extensions.crypt('senha123', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"],"active_tenant_id":"aaaaaaaa-0000-0000-0000-000000000000"}'::jsonb,
   '{"nome":"Operador Carvalho"}'::jsonb, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000003','authenticated','authenticated',
   'financeiro@carvalho.test', extensions.crypt('senha123', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"],"active_tenant_id":"aaaaaaaa-0000-0000-0000-000000000000"}'::jsonb,
   '{"nome":"Financeiro Carvalho"}'::jsonb, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000009','authenticated','authenticated',
   'admin@eradigital.test', extensions.crypt('senha123', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"],"is_super_admin":true}'::jsonb,
   '{"nome":"Super Admin"}'::jsonb, '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(),'10000000-0000-0000-0000-000000000001',
   '{"sub":"10000000-0000-0000-0000-000000000001","email":"daniel@carvalho.test"}'::jsonb,'email','daniel@carvalho.test',now(),now(),now()),
  (gen_random_uuid(),'10000000-0000-0000-0000-000000000002',
   '{"sub":"10000000-0000-0000-0000-000000000002","email":"operador@carvalho.test"}'::jsonb,'email','operador@carvalho.test',now(),now(),now()),
  (gen_random_uuid(),'10000000-0000-0000-0000-000000000003',
   '{"sub":"10000000-0000-0000-0000-000000000003","email":"financeiro@carvalho.test"}'::jsonb,'email','financeiro@carvalho.test',now(),now(),now()),
  (gen_random_uuid(),'10000000-0000-0000-0000-000000000009',
   '{"sub":"10000000-0000-0000-0000-000000000009","email":"admin@eradigital.test"}'::jsonb,'email','admin@eradigital.test',now(),now(),now())
on conflict do nothing;

-- Associações usuário<->tenant + papel (RF9.2/9.4)
insert into tenant_usuarios (tenant_id, usuario_id, papel) values
  ('aaaaaaaa-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000001','owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000002','operador'),
  ('aaaaaaaa-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000003','financeiro')
on conflict (tenant_id, usuario_id) do nothing;

-- -----------------------------------------------------------------------------
-- Assinatura + conexão WhatsApp + metering
-- -----------------------------------------------------------------------------
insert into assinaturas (tenant_id, plano_id, gateway, status, periodo_inicio, periodo_fim) values
  ('aaaaaaaa-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222', null, 'ativa',
   date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date)
on conflict do nothing;

insert into whatsapp_instances (tenant_id, provider, api_url, api_key, instance_name, numero, status, last_seen) values
  ('aaaaaaaa-0000-0000-0000-000000000000','evolution','https://evolution.exemplo.com','TROQUE_ESTA_CHAVE',
   'carvalho-junior','+5511988880000','conectada', now())
on conflict (tenant_id) do nothing;

insert into uso_mensal (tenant_id, competencia, envios_whatsapp) values
  ('aaaaaaaa-0000-0000-0000-000000000000', to_char(now(),'YYYY-MM'), 7)
on conflict (tenant_id, competencia) do nothing;

-- -----------------------------------------------------------------------------
-- Fontes de lead (RF5.5) e Centros de custo (RF6.2) — IDs fixos p/ referência
-- -----------------------------------------------------------------------------
insert into fontes_lead (id, tenant_id, nome, tipo) values
  ('f0000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000000','OLX','pago'),
  ('f0000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000000','Instagram','pago'),
  ('f0000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000000','Indicação','organico'),
  ('f0000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000000','WhatsApp (lista)','organico')
on conflict (id) do nothing;

-- Documentos do comprador (select controlado por tenant) — IDs fixos p/ referência
insert into documentos_comprador (id, tenant_id, nome) values
  ('d0000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000000','Procuração'),
  ('d0000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000000','DUT')
on conflict (id) do nothing;

insert into centros_custo (id, tenant_id, nome, tipo) values
  ('c0000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000000','Custos operacionais','operacional'),
  ('c0000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000000','Comissão terceiros','operacional'),
  ('c0000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000000','Marketing/ADS','operacional'),
  ('c0000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000000','Folha','operacional'),
  ('c0000000-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000000','Jurídico','operacional'),
  ('c0000000-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000000','Não Operacional','nao_operacional'),
  ('c0000000-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000000','Multas Carros','operacional')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Contatos (RF2.*) — mix de tipos, opt-in e ativo
-- -----------------------------------------------------------------------------
insert into contatos (id, tenant_id, nome, telefone, tipo, cidade, tags, opt_in_whatsapp, ativo) values
  ('c1000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000000','Auto Center Zé','+5511990001001','lojista','São Paulo','{vip,sedans}',true,true),
  ('c1000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000000','Loja do Marcão','+5511990001002','lojista','Guarulhos','{suv}',true,true),
  ('c1000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000000','Multimarcas Silva','+5511990001003','lojista','Osasco','{}',true,true),
  ('c1000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000000','Repasse JR','+5511990001004','lojista','Santo André','{populares}',true,true),
  ('c1000000-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000000','Garagem Premium','+5511990001005','lojista','São Paulo','{vip}',true,true),
  ('c1000000-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000000','Cardoso Veículos','+5511990001006','lojista','São Bernardo','{}',true,true),
  ('c1000000-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000000','Nova Era Motors','+5511990001007','lojista','Diadema','{suv,sedans}',true,true),
  ('c1000000-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000000','Point Car','+5511990001008','lojista','São Paulo','{}',true,true),
  ('c1000000-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000000','AutoShop Lima','+5511990001009','lojista','Mauá','{}',true,true),
  ('c1000000-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000000','Veloz Repasses','+5511990001010','lojista','São Paulo','{populares}',true,true),
  ('c1000000-0000-0000-0000-000000000011','aaaaaaaa-0000-0000-0000-000000000000','Captador André','+5511990001011','captador','São Paulo','{}',true,true),
  ('c1000000-0000-0000-0000-000000000012','aaaaaaaa-0000-0000-0000-000000000000','Cliente João','+5511990001012','cliente_final','São Paulo','{}',false,true),
  ('c1000000-0000-0000-0000-000000000013','aaaaaaaa-0000-0000-0000-000000000000','Loja Sem Optin','+5511990001013','lojista','Cotia','{}',false,true),
  ('c1000000-0000-0000-0000-000000000014','aaaaaaaa-0000-0000-0000-000000000000','Loja Inativa','+5511990001014','lojista','Barueri','{}',true,false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Negócios (RF1.*) — espalhados em 2026, com status/fontes variados.
-- lucro é GENERATED (RB1).
-- -----------------------------------------------------------------------------
insert into negocios (id, tenant_id, data_negocio, carro, placa, ano, km,
  valor_compra, custos_pagos_cliente, valor_venda, custos_operacionais, comissao_terceiros,
  comprador_id, fonte_id, tipo_documento, ipva_status, pneus, gastos, fipe, preco_pedido, status,
  data_retirada, data_entrega) values
  ('a1000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000000','2026-01-12','Chevrolet Onix 1.0 LT','ABC1D23',2020,58000,
     42000,300,49000,900,600,'c1000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001','dut','pago','Bons','Revisão',48500,49900,'entregue','2026-01-12','2026-01-15'),
  ('a1000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000000','2026-01-25','Hyundai HB20 1.6 Comfort','DEF2E34',2019,71000,
     38000,200,45000,700,500,'c1000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002','procuracao','aberto','Meia-vida','',44000,46900,'entregue','2026-01-25','2026-01-28'),
  ('a1000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000000','2026-02-08','VW Gol 1.6 MSI','GHI3F45',2018,89000,
     31000,400,38500,800,400,'c1000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000001','dut','pago','Novos','Pneus novos',37000,39900,'entregue','2026-02-08','2026-02-10'),
  ('a1000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000000','2026-02-20','Jeep Renegade 1.8','JKL4G56',2021,42000,
     78000,500,89000,1500,1000,'c1000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000003','dut','pago','Bons','',87000,91900,'entregue','2026-02-20','2026-02-24'),
  ('a1000000-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000000','2026-03-05','Toyota Corolla XEI 2.0','MNO5H67',2020,63000,
     92000,600,105000,1800,1200,'c1000000-0000-0000-0000-000000000006','f0000000-0000-0000-0000-000000000004','dut','pago','Novos','',103000,108900,'entregue','2026-03-05','2026-03-09'),
  ('a1000000-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000000','2026-03-22','Fiat Argo Drive 1.3','PQR6I78',2022,28000,
     55000,300,62000,900,700,'c1000000-0000-0000-0000-000000000007','f0000000-0000-0000-0000-000000000002','procuracao','pago','Bons','',61000,63900,'entregue','2026-03-22','2026-03-25'),
  ('a1000000-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000000','2026-04-10','Honda Civic EXL 2.0','STU7J89',2019,77000,
     88000,700,99000,1600,1000,'c1000000-0000-0000-0000-000000000008','f0000000-0000-0000-0000-000000000001','dut','aberto','Meia-vida','Ar a revisar',97000,102900,'entregue','2026-04-10','2026-04-14'),
  ('a1000000-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000000','2026-04-28','Renault Kwid Zen 1.0','VWX8K90',2021,33000,
     41000,200,47000,600,400,'c1000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000003','dut','pago','Bons','',46000,48500,'entregue','2026-04-28','2026-05-02'),
  ('a1000000-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000000','2026-05-14','Chevrolet Tracker Premier','YZA9L01',2022,25000,
     98000,800,112000,2000,1500,'c1000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000002','dut','pago','Novos','',110000,116900,'vendido','2026-05-14',null),
  ('a1000000-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000000','2026-06-03','Nissan Kicks SV 1.6','BCD0M12',2020,59000,
     72000,400,81000,1200,800,'c1000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000004','procuracao','pago','Bons','',80000,83900,'vendido','2026-06-03',null),
  ('a1000000-0000-0000-0000-000000000011','aaaaaaaa-0000-0000-0000-000000000000','2026-06-18','Ford Ka SE 1.0','EFG1N23',2019,82000,
     33000,300,0,500,0,'c1000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000001','dut','aberto','Ruins','Troca de embreagem',35000,37900,'em_negociacao',null,null),
  ('a1000000-0000-0000-0000-000000000012','aaaaaaaa-0000-0000-0000-000000000000','2026-06-27','Hyundai Creta Action 1.6','HIJ2O34',2023,15000,
     105000,0,0,0,0,null,'f0000000-0000-0000-0000-000000000003','dut','pago','Novos','',108000,112900,'problema',null,null)
on conflict (id) do nothing;

-- Fotos (RF1.4) — capa + adicionais (placeholders)
insert into negocio_fotos (tenant_id, negocio_id, url, ordem, is_capa) values
  ('aaaaaaaa-0000-0000-0000-000000000000','a1000000-0000-0000-0000-000000000005','https://picsum.photos/seed/corolla1/900/600',0,true),
  ('aaaaaaaa-0000-0000-0000-000000000000','a1000000-0000-0000-0000-000000000005','https://picsum.photos/seed/corolla2/900/600',1,false),
  ('aaaaaaaa-0000-0000-0000-000000000000','a1000000-0000-0000-0000-000000000005','https://picsum.photos/seed/corolla3/900/600',2,false),
  ('aaaaaaaa-0000-0000-0000-000000000000','a1000000-0000-0000-0000-000000000009','https://picsum.photos/seed/tracker1/900/600',0,true),
  ('aaaaaaaa-0000-0000-0000-000000000000','a1000000-0000-0000-0000-000000000009','https://picsum.photos/seed/tracker2/900/600',1,false)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Campanhas (RF3.*) + envios com status variados
-- -----------------------------------------------------------------------------
insert into campanhas (id, tenant_id, negocio_id, tipo, template_texto, status, total_destinatarios, total_enviados, total_falhas, criado_por, created_at) values
  ('ca000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000000','a1000000-0000-0000-0000-000000000005','novo_carro',
   E'🚗 *Toyota Corolla XEI 2.0* 2020\n63.000 km\nIPVA: pago | Pneus: Novos\nFIPE: R$ 103.000,00\n💰 *R$ 108.900,00*\n\n👉 Mais detalhes e fotos: http://localhost:5173/c/a1000000-0000-0000-0000-000000000005',
   'concluida',6,5,1,'10000000-0000-0000-0000-000000000002','2026-03-05 10:00:00'),
  ('ca000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000000','a1000000-0000-0000-0000-000000000009','novo_carro',
   E'🚗 *Chevrolet Tracker Premier* 2022\n25.000 km\nIPVA: pago | Pneus: Novos\nFIPE: R$ 110.000,00\n💰 *R$ 116.900,00*\n\n👉 Mais detalhes e fotos: http://localhost:5173/c/a1000000-0000-0000-0000-000000000009',
   'enviando',4,2,0,'10000000-0000-0000-0000-000000000002','2026-05-14 09:30:00')
on conflict (id) do nothing;

insert into campanha_envios (tenant_id, campanha_id, contato_id, status, enviado_at) values
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','lido','2026-03-05 10:01:00'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','lido','2026-03-05 10:01:30'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','entregue','2026-03-05 10:02:00'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000005','lido','2026-03-05 10:02:30'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000006','enviado','2026-03-05 10:03:00'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000008','falha',null),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','enviado','2026-05-14 09:31:00'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000007','enviado','2026-05-14 09:31:30'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000009','pendente',null),
  ('aaaaaaaa-0000-0000-0000-000000000000','ca000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000010','pendente',null)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Lançamentos de custo (RF6.*) — alimentam o DRE (marketing/folha/não op.)
-- -----------------------------------------------------------------------------
insert into lancamentos_custo (tenant_id, data_pagamento, centro_custo_id, descricao, valor, negocio_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-01-05','c0000000-0000-0000-0000-000000000003','Tráfego pago - Janeiro',2500,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-02-05','c0000000-0000-0000-0000-000000000003','Tráfego pago - Fevereiro',2800,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-03-05','c0000000-0000-0000-0000-000000000003','Tráfego pago - Março',3200,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-04-05','c0000000-0000-0000-0000-000000000003','Tráfego pago - Abril',3000,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-05-05','c0000000-0000-0000-0000-000000000003','Tráfego pago - Maio',3500,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-06-05','c0000000-0000-0000-0000-000000000003','Tráfego pago - Junho',3300,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-01-31','c0000000-0000-0000-0000-000000000004','Folha - Janeiro',6000,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-02-28','c0000000-0000-0000-0000-000000000004','Folha - Fevereiro',6000,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-03-31','c0000000-0000-0000-0000-000000000004','Folha - Março',6500,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-04-30','c0000000-0000-0000-0000-000000000004','Folha - Abril',6500,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-05-31','c0000000-0000-0000-0000-000000000004','Folha - Maio',6500,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-06-30','c0000000-0000-0000-0000-000000000004','Folha - Junho',6800,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-02-15','c0000000-0000-0000-0000-000000000001','Guincho e vistoria',450,'a1000000-0000-0000-0000-000000000004'),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-03-18','c0000000-0000-0000-0000-000000000001','Detalhamento/estética',600,'a1000000-0000-0000-0000-000000000005'),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-04-02','c0000000-0000-0000-0000-000000000007','Multa - Renegade',195,'a1000000-0000-0000-0000-000000000004'),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-05-20','c0000000-0000-0000-0000-000000000006','Contador - honorários',1200,null),
  ('aaaaaaaa-0000-0000-0000-000000000000','2026-06-10','c0000000-0000-0000-0000-000000000005','Assessoria jurídica',900,null)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Acordos (RF7.*) — saldo/status recalculados pelo trigger ao inserir pagamentos
-- -----------------------------------------------------------------------------
insert into acordos (id, tenant_id, codigo_caso, caso, responsavel, tipo, valor_original, saldo, status, negocio_id) values
  ('ac000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000000','CJ-001','Vício oculto - Civic','Daniel','recebimento',15000,15000,'aguardando','a1000000-0000-0000-0000-000000000007'),
  ('ac000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000000','CJ-002','Atraso documentação - Kwid','Financeiro','recebimento',8000,8000,'aguardando','a1000000-0000-0000-0000-000000000008')
on conflict (id) do nothing;

insert into acordo_pagamentos (tenant_id, acordo_id, data, beneficiario, valor, recebido_pago) values
  ('aaaaaaaa-0000-0000-0000-000000000000','ac000000-0000-0000-0000-000000000001','2026-04-20','Comprador Civic',5000,'pago'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ac000000-0000-0000-0000-000000000001','2026-05-20','Comprador Civic',3000,'pago'),
  ('aaaaaaaa-0000-0000-0000-000000000000','ac000000-0000-0000-0000-000000000002','2026-05-10','Cliente Kwid',8000,'pago')
on conflict do nothing;

# PRD — CRM de Repasse de Veículos (SaaS multi-tenant)

| | |
|---|---|
| **Produto** | Plataforma SaaS de gestão de repasse de veículos + motor de campanhas WhatsApp |
| **Origem** | Necessidade da Carvalho Júnior (repasse B2B), evoluída para produto vendável pela Era Digital |
| **Modelo** | **SaaS multi-tenant** (B2B), white-label opcional |
| **Cliente-piloto (tenant 0)** | Carvalho Júnior |
| **Canal go-to-market** | Era Digital (agência) — venda direta e como add-on de pacotes |
| **Stakeholders** | Daniel Carvalho (operação), Alessandro (sócio / Era Digital / dono do produto), Financeiro (Era Digital) |
| **Autor** | Leandro |
| **Versão** | 0.2 (SaaS / multi-tenant) |
| **Data** | Julho/2026 |
| **Alvo de implementação** | Claude Code |

---

## 1. Contexto e problema

Repassadores de veículos operam em **B2B**: o carro chega, fecham a compra com o cliente final e **repassam rapidamente para lojistas**. Não há estoque nem catálogo próprio — o carro entra e sai (retirada → entrega). **As vendas acontecem por telefone/WhatsApp**, e a operação é baseada em confiança (o lojista paga antes de a documentação ser concluída).

Hoje esses negócios são geridos em **planilha** — modelo financeiro que funciona, mas frágil (aba por mês, referências quebradas, cálculos que estouram sem dado) e que não resolve a dor de distribuição.

Há **duas dores** que se repetem no segmento (validadas com a Carvalho Júnior):

**1.1 Distribuição via WhatsApp (dor urgente).** A lista de transmissão do lojista foi bloqueada pela Meta; grupo não resolve (70–90% não acompanham). O repassador **não quer trocar de número** (a credibilidade está atrelada a ele). Precisa de uma lista **enxuta de compradores reais** (~100) e de disparo confiável de "carro novo".

**1.2 Organização (CRM/financeiro).** Centralizar números da empresa (DRE), custo por carro, ROI por canal de aquisição, contrato de compra e venda e controle de acordos/disputas.

**Decisão de produto:** essa dor é comum a muitos repassadores. Em vez de um sistema sob medida para um cliente, o produto será um **SaaS multi-tenant**: cada repassador é um **tenant** isolado, com seus dados, seu número de WhatsApp e sua assinatura. A Era Digital vende e (opcionalmente) revende white-label.

---

## 2. Objetivos e métricas de sucesso

| Objetivo | Métrica |
|---|---|
| Resolver a distribuição WhatsApp por tenant | Disparo de "carro novo" funcionando, taxa de entrega monitorada, sem ban permanente do número |
| Substituir a planilha como fonte da verdade | 100% dos negócios do mês no CRM; dashboard mensal automático |
| Operar como SaaS saudável | **MRR**, **churn**, **ativação de tenant** (tempo até 1ª campanha enviada), tenants ativos |
| Isolamento e segurança multi-tenant | **Zero vazamento cross-tenant** (garantido em nível de banco por RLS) |
| Habilitar revenda pela Era Digital | White-label por tenant + back-office de gestão de tenants operacionais |

---

## 3. Personas e papéis

**Papéis dentro de um tenant (RBAC):**
1. **Owner** — dono da conta do repassador; gerencia assinatura, usuários e configurações.
2. **Admin** — gestão operacional completa do tenant.
3. **Operador** (ex.: Daniel) — cadastra carros, dispara campanhas, fecha negócios, gera contratos. Mobile-first.
4. **Financeiro** — lança custos, acompanha DRE e acordos.
5. **Viewer** — leitura (sócios, contador).

**Papel da plataforma (fora do tenant):**
6. **Super-admin (Era Digital)** — back-office: cria/suspende tenants, define planos, acompanha saúde das instâncias WhatsApp, dá suporte (impersonation auditada).

---

## 4. Escopo

### 4.1 Dentro do escopo
- **Multi-tenancy** (isolamento, IAM/RBAC, tenant provisioning) — **fundacional**
- **Planos, assinaturas, limites e billing**
- **Back-office / super-admin**
- **White-label por tenant** (logo, cores, domínio)
- Cadastro de negócios/carros (com fotos)
- Base de contatos com opt-in
- Motor de campanhas WhatsApp **por tenant** (número próprio) + página pública de detalhes do carro
- Dashboard financeiro (DRE mensal)
- Captação / ROI por canal
- Custos (centros de custo + lançamentos)
- Acordos (jurídico) + pagamentos
- Geração de contrato de compra e venda em PDF
- Acesso **web/nuvem, responsivo (mobile-first)** — **não é app nativo**

### 4.2 Fora do escopo
- Site público / catálogo de veículos (não há estoque; carros giram rápido). A única página pública é a de "mais detalhes" de um carro, via link da campanha.
- App nativo (iOS/Android)
- Integração contábil/fiscal externa
- Funil de vendas/pipeline complexo (não é o modelo do segmento)

---

## 5. Requisitos funcionais por módulo

> Módulos 1–8 são o CRM em si (dentro de cada tenant). Módulos 9–12 são a camada SaaS.

### Módulo 1 — Gestão de Negócios (carros)
- **RF1.1** Cadastrar negócio: data, carro, placa, ano, km, valor de compra (pago ao cliente), custos pagos cliente, valor de venda, custos operacionais, comissão de terceiros, comprador, fonte (canal), tipo de documento (procuração/DUT), data de retirada, data de entrega, link Drive, observações.
- **RF1.2** **Lucro calculado**: `Valor de venda − (Valor de compra + Custos pagos cliente + Custos operacionais + Comissão terceiros)`.
- **RF1.3** Campos do anúncio: IPVA (pago/aberto), estado dos pneus, gastos, FIPE, preço pedido.
- **RF1.4** Múltiplas **fotos** por negócio (com capa).
- **RF1.5** Status: `em_negociacao` / `vendido` / `entregue` / `problema`.
- **RF1.6** Listagem com filtro por período, status e fonte — **tabela única filtrada por data** (não aba por mês).

### Módulo 2 — Contatos
- **RF2.1** Cadastrar contato: nome, telefone (WhatsApp), tipo (lojista/cliente final/captador), cidade, tags, observações.
- **RF2.2** **Opt-in de WhatsApp** por contato (consentimento).
- **RF2.3** Ativo/inativo.
- **RF2.4** Segmentação por tags.
- **RF2.5** Importar contatos (CSV) para popular a lista inicial (~100).

### Módulo 3 — Campanhas WhatsApp (prioridade máxima)
- **RF3.1** Ao cadastrar/editar carro, check **"enviar para a lista"** dispara a campanha.
- **RF3.2** Mensagem no **template padrão de anúncio**: modelo, ano, km; IPVA, pneu, gastos, FIPE; preço. **Uma foto**, mensagem única.
- **RF3.3** Link **"mais detalhes"** → **página pública do carro** com todas as fotos e infos.
- **RF3.4** Template **configurável por tenant**.
- **RF3.5** Só contatos com opt-in e ativos.
- **RF3.6** **Log de envio por destinatário** (pendente/enviado/entregue/lido/falha) — monitoramento de saúde do número.
- **RF3.7** **Throttling** com intervalo aleatório entre envios (configurável).
- **RF3.8** Painel da campanha (destinatários, enviados, falhas).
- **RF3.9** **Conexão de WhatsApp por tenant** — cada tenant conecta o **próprio número** (pareamento por QR na instância dedicada). O número pessoal do operador é preservado com número dedicado. *(Ver §7.4 e §11.)*
- **RF3.10** O envio respeita o **limite de mensagens do plano** do tenant (ver Módulo 10).

### Módulo 4 — Dashboard financeiro (DRE mensal)
- **RF4.1** DRE mensal automático: custo de compra, custo de venda, custos pagos cliente, **receita bruta** (`venda − compra`), custos operacionais, comissão, marketing/ADS, folha, despesas não op., **lucro líquido**.
- **RF4.2** Indicadores: crescimento vs. mês anterior, nº de vendas, ticket médio.
- **RF4.3** Visão anual (12 meses + total).
- **RF4.4** Estados vazios tratados (sem `#DIV/0!`).

### Módulo 5 — Captação / ROI por canal
- **RF5.1** Por fonte: lucro bruto/líquido, nº de vendas, ticket médio, **CPS**, **leads**, **CPL**, **participação no faturamento**.
- **RF5.2** Investimento em ADS e gestor de tráfego por mês.
- **RF5.3** Desdobramento OLX por captadora (custo da captadora).
- **RF5.4** Comparativo com período anterior.
- **RF5.5** **Fonte = lista controlada por tenant** (dropdown), não texto livre.

### Módulo 6 — Custos / centros de custo
- **RF6.1** Lançamento: data pagamento, centro de custo, descrição, valor, observações.
- **RF6.2** Centros: Custos operacionais, Comissão terceiros, Marketing/ADS, Folha, Jurídico, Não Operacional, Multas Carros.
- **RF6.3** Vincular lançamento a um negócio (custo por carro).
- **RF6.4** Rateio por centro/mês → alimenta o Dashboard.

### Módulo 7 — Acordos (jurídico)
- **RF7.1** Cadastrar acordo: código do caso, caso, responsável, tipo, valor original, recuperado/pago, **saldo** (calculado), status, link Drive, negócio vinculado (opcional).
- **RF7.2** Pagamentos do acordo: data, beneficiário, valor, recebido/pago, observações.
- **RF7.3** Saldo devedor automático.
- **RF7.4** Listagem por status.

### Módulo 8 — Contrato de compra e venda
- **RF8.1** Gerar contrato **pré-preenchido** (dados do carro + do vendedor/tenant + do comprador).
- **RF8.2** Exportar **PDF**.
- **RF8.3** Template **por tenant**, editável/versionável.
- **RF8.4** Armazenar vinculado ao negócio.

### Módulo 9 — Tenants, IAM e RBAC (SaaS)
- **RF9.1** **Cadastro/auto-provisionamento de tenant** (signup cria a organização + owner).
- **RF9.2** **Convite de usuários** para um tenant, com atribuição de papel.
- **RF9.3** Um usuário pode pertencer a **um ou mais tenants**; ao logar, escolhe/troca de tenant ativo.
- **RF9.4** **RBAC por tenant** (owner/admin/operador/financeiro/viewer) controlando acesso a módulos e ações.
- **RF9.5** **Isolamento total de dados** entre tenants, garantido em nível de banco (RLS) — ver §7.
- **RF9.6** Configurações do tenant: dados da empresa, fuso, moeda.

### Módulo 10 — Planos, assinaturas e limites (SaaS)
- **RF10.1** **Catálogo de planos** (ex.: Starter / Pro / Agência), cada um com **limites/entitlements**: nº de usuários, nº de contatos, **envios de WhatsApp/mês**, módulos habilitados, white-label sim/não.
- **RF10.2** **Assinatura por tenant** com status (`trial` / `ativa` / `inadimplente` / `cancelada`).
- **RF10.3** **Billing** integrado a gateway (recomendado gateway BR com **PIX/boleto/cartão** — Asaas, Iugu ou Pagar.me), com cobrança recorrente e webhooks de status.
- **RF10.4** **Medição de uso** (metering) — principalmente envios de WhatsApp — para aplicar limites e faturar excedente.
- **RF10.5** **Enforcement de limites**: ao exceder (ex.: envios/mês), bloquear/avisar conforme regra do plano.
- **RF10.6** **Trial** e downgrade/upgrade de plano.

### Módulo 11 — Back-office / Super-admin (SaaS)
- **RF11.1** CRUD de tenants; suspender/reativar.
- **RF11.2** Visão de **saúde das instâncias WhatsApp** por tenant (conectada/desconectada/banida).
- **RF11.3** Gestão de planos e overrides de limite por tenant.
- **RF11.4** Métricas do negócio (MRR, tenants ativos, uso agregado).
- **RF11.5** **Impersonation auditada** para suporte (logar como tenant sem ver senha).
- **RF11.6** Log de auditoria de ações sensíveis.

### Módulo 12 — Onboarding e White-label (SaaS)
- **RF12.1** **Fluxo de onboarding**: signup → criar tenant → conectar WhatsApp (QR) → importar contatos → 1ª campanha.
- **RF12.2** **White-label por tenant**: logo, cores, e-mail remetente; opcional **domínio/subdomínio próprio** (ex.: `cliente.seucrm.com`).
- **RF12.3** Branding aplicado à página pública do carro.

---

## 6. Modelo de dados

Postgres (Supabase). **Todas as tabelas de dados do CRM carregam `tenant_id`** e são protegidas por RLS. Abaixo, apenas o essencial.

### Camada SaaS

**`tenants`** — id (uuid PK), nome, slug, dominio_custom, logo_url, cor_primaria, plano_id (FK), status_assinatura (`trial`/`ativa`/`inadimplente`/`cancelada`), trial_expira_em, created_at.

**`usuarios`** — id (uuid PK, = auth.users), nome, email, telefone. *(Autenticação via Supabase Auth.)*

**`tenant_usuarios`** (associação N:N + papel) — id, tenant_id (FK), usuario_id (FK), papel (`owner`/`admin`/`operador`/`financeiro`/`viewer`), ativo. **Único(tenant_id, usuario_id).**

**`planos`** — id (uuid PK), nome, preco_mensal, limite_usuarios, limite_contatos, **limite_envios_mes**, modulos (jsonb/flags), white_label (bool), ativo.

**`assinaturas`** — id, tenant_id (FK), plano_id (FK), gateway, gateway_subscription_id, status, periodo_inicio, periodo_fim, created_at.

**`uso_mensal`** (metering) — id, tenant_id (FK), competencia (yyyy-mm), envios_whatsapp int, **Único(tenant_id, competencia)**.

**`whatsapp_instances`** — id, tenant_id (FK), provider (`evolution`/`cloud_api`), instance_name/waba_id, numero, status (`desconectada`/`conectada`/`banida`), last_seen, **Único(tenant_id)**.

**`audit_log`** — id, tenant_id (nullable), ator_usuario_id, acao, entidade, entidade_id, payload jsonb, created_at.

### Camada CRM (todas com `tenant_id` + RLS)

**`contatos`** — id, **tenant_id**, nome, telefone (E.164), tipo (`lojista`/`cliente_final`/`captador`), cidade, tags text[], opt_in_whatsapp bool, ativo, observacoes, timestamps.

**`fontes_lead`** — id, **tenant_id**, nome, tipo (`pago`/`organico`), ativo. *(Agora por tenant.)*

**`negocios`** — id, **tenant_id**, data_negocio, carro, placa, ano, km, valor_compra, custos_pagos_cliente, valor_venda, custos_operacionais, comissao_terceiros, **lucro (GENERATED)**, comprador_id (FK contatos), fonte_id (FK fontes_lead), tipo_documento (`procuracao`/`dut`), ipva_status, pneus, gastos, fipe, preco_pedido, status, data_retirada, data_entrega, link_drive, observacoes, timestamps.

**`negocio_fotos`** — id, **tenant_id**, negocio_id (FK), url (Storage), ordem, is_capa.

**`campanhas`** — id, **tenant_id**, negocio_id (FK, nullable), tipo (`novo_carro`/`manual`), template_texto, status, total_destinatarios, total_enviados, total_falhas, criado_por, created_at.

**`campanha_envios`** — id, **tenant_id**, campanha_id (FK), contato_id (FK), status (`pendente`/`enviado`/`entregue`/`lido`/`falha`), erro, enviado_at.

**`centros_custo`** — id, **tenant_id**, nome, tipo (`operacional`/`nao_operacional`).
**`lancamentos_custo`** — id, **tenant_id**, data_pagamento, centro_custo_id (FK), descricao, valor, negocio_id (FK, nullable), observacoes.

**`acordos`** — id, **tenant_id**, codigo_caso, caso, responsavel, tipo, valor_original, valor_recuperado_pago, saldo (calc.), status (`aberto`/`quitado`), negocio_id (FK, nullable), link_drive.
**`acordo_pagamentos`** — id, **tenant_id**, acordo_id (FK), data, beneficiario, valor, recebido_pago (`recebido`/`pago`), observacoes.

**`contratos`** — id, **tenant_id**, negocio_id (FK), template_id, dados_cliente jsonb, pdf_url, status, created_at.

> **Dashboard e Captação são views/RPC agregadas por período e por tenant** — não tabelas. Toda view respeita a RLS.

---

## 7. Arquitetura técnica (SaaS multi-tenant)

Alinhada à stack do Leandro (React/TS, Supabase, Docker/Portainer). As decisões novas são as de multi-tenancy.

### 7.1 Isolamento de dados — **decisão central**
**Banco único, schema único, `tenant_id` em cada linha, isolamento por Row Level Security (RLS) do Postgres.**
- É a abordagem padrão de SaaS no Supabase: barata, simples de operar e com o isolamento **imposto no banco** (não na aplicação) — a rede de segurança contra vazamento cross-tenant.
- O `tenant_id` do usuário vai como **claim no JWT**; as **policies RLS** filtram automaticamente por esse claim. Mesmo um bug na aplicação não vaza dados de outro tenant.
- *Alternativas consideradas e descartadas para o estágio atual:* schema-por-tenant (complexidade de migração) e banco-por-tenant (isolamento máximo, mas overhead operacional alto). Reavaliar só se surgir cliente enterprise com exigência de isolamento físico.

### 7.2 IAM / Autenticação
- **Supabase Auth** + custom claims (`tenant_id`, `papel`) injetados via auth hook. Leve e nativo da RLS — recomendado para lançar rápido.
- **Alternativa:** Keycloak (realms/organizations) se, no futuro, quiserem IAM centralizado entre múltiplos produtos ou SSO enterprise. Fica registrado como caminho de evolução, não para o MVP (evita overhead de operar Keycloak agora).
- Resolução de tenant: por seleção no login (usuário multi-tenant) e/ou por subdomínio no white-label.

### 7.3 Aplicação
- **Frontend:** React + TypeScript (Vite), **mobile-first** (operação no celular). Tailwind + shadcn/ui. Tema dinâmico por tenant (white-label).
- **Backend/dados:** Supabase (Postgres + Auth + Storage + RLS). Agregações via views/RPC.
- **Storage:** buckets isolados por tenant (fotos e PDFs), com política de acesso por `tenant_id`.

### 7.4 Camada de mensageria WhatsApp — **provider abstraído por tenant**
Cada tenant tem **um número/instância própria**. A camada de envio é uma **abstração de provedor**, permitindo dois backends:
- **Evolution API (Baileys), self-hosted em Docker** — sem custo por mensagem. **Multi-instância**: uma sessão por tenant (pareada por QR). Bom para **MVP/pilot** e para tenants menores. *Atenção: N sessões WhatsApp Web têm custo operacional (reconexões, persistência de sessão) e risco de ToS.*
- **WhatsApp Cloud API oficial (via BSP)** — compatível com os termos da Meta, com custo por conversa. Cada tenant registra o próprio número/WABA. **Caminho recomendado para escalar o SaaS** (ver §11).
- Um **worker** consome a fila de `campanha_envios`, envia com throttling, atualiza status por destinatário e **decrementa o limite do plano** (metering).

### 7.5 Billing
- Gateway BR com **PIX/boleto/cartão** (Asaas / Iugu / Pagar.me), cobrança recorrente e **webhooks** atualizando `assinaturas.status`. Enforcement de limites lê `planos` + `uso_mensal`.

### 7.6 Hospedagem
- VPS + **Docker + Portainer** (setup existente). Componentes: app web, Supabase, Evolution API (multi-instância), worker de envio. Reavaliar escala do Evolution conforme nº de tenants ativos.

---

## 8. Regras de negócio

- **RB1 — Lucro por negócio:** `Venda − (Compra + Custos cliente + Custos operacionais + Comissão)`.
- **RB2 — Receita bruta:** `Venda − Compra` no período.
- **RB3 — Lucro líquido:** receita bruta − custos cliente − comissão − marketing − folha − despesas não op.
- **RB4 — Saldo do acordo:** `Valor original − Σ pagamentos`.
- **RB5 — Elegibilidade de campanha:** contatos com `opt_in_whatsapp = true` e `ativo = true`.
- **RB6 — CPL/CPS:** investimento do canal ÷ leads / ÷ vendas do canal.
- **RB7 — Isolamento:** toda leitura/escrita é filtrada por `tenant_id` via RLS. Nenhuma query cruza tenants (exceto super-admin, com policy própria e auditada).
- **RB8 — Limite de envios:** um disparo só ocorre se `uso_mensal.envios + destinatários ≤ plano.limite_envios_mes`; caso contrário, bloquear/avisar.
- **RB9 — Acesso por papel:** cada ação valida o papel do usuário no tenant (RBAC).

---

## 9. Decisões que corrigem a planilha
1. **Tabela única de negócios com filtro por período** (a planilha já tem `#REF!` por causa do modelo de aba por mês).
2. **Fonte como lista controlada** (dropdown), agora **por tenant**.
3. **Contatos como entidade própria** — base da lista de transmissão.
4. **Estados vazios tratados** (sem `#DIV/0!`).
5. **Acordos na versão normalizada** (`Controle de Acordos` / `Pagamento Acordos`).

---

## 10. Fluxos principais

**Fluxo 0 — Onboarding do tenant (SaaS):** signup → cria tenant + owner → escolhe plano/trial → conecta WhatsApp (QR ou registro Cloud API) → importa contatos (CSV) → envia 1ª campanha. *(Métrica de ativação.)*

**Fluxo A — Entrada de carro e disparo:** cadastra o negócio (dados + fotos) → check "enviar para a lista" → sistema monta a mensagem (template + link "mais detalhes") → valida limite do plano → enfileira envios com throttling → lojista recebe e clica no link → **página pública do carro** → log de envio registra entrega/leitura/falha.

**Fluxo B — Fechamento e contrato:** negócio `vendido` → gera contrato pré-preenchido → complementa dados do cliente → exporta PDF → vincula ao negócio.

**Fluxo C — Fechamento financeiro:** financeiro lança custos (por carro quando aplicável) → dashboard consolida DRE, ticket médio, crescimento e ROI por canal.

---

## 11. Riscos e mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| **WhatsApp não oficial em escala de SaaS** — vender Baileys/Evolution para muitos clientes multiplica risco de ban e de indisponibilidade; um ban vira "produto falhando" | **Alta** | MVP/pilot no Evolution para validar; **plano de migração para a Cloud API oficial (via BSP)** como caminho de escala; **camada de provider abstraída** para conviver com os dois; número dedicado, lista enxuta, throttling e monitoramento por tenant. |
| **Vazamento cross-tenant** (o risco nº 1 de qualquer SaaS) | **Alta** | Isolamento **no banco** via RLS por `tenant_id` (não confiar só na aplicação); testes automatizados de isolamento; policy separada e auditada para super-admin. |
| Escalar N sessões WhatsApp Web (Evolution) | Média | Monitorar saúde por instância (`whatsapp_instances`); limitar tenants por servidor; migrar tenants maiores para Cloud API. |
| Ban do número por tenant | Média | Regra de escalada: 1º bloqueio temporário → tenta; 2º → pausa. Áudio/ligação do operador reforçando credibilidade do número. |
| Mudança de licenciamento Baileys/Evolution | Média | Validar termos antes de produção; abstração de provedor reduz o custo de troca. |
| **LGPD** (dados de contatos, multi-tenant) | Média/Alta | Opt-in explícito, opt-out, minimização; **controlador é cada tenant, operador é a plataforma** — deixar claro em contrato/DPA; não expor dados pessoais na página pública do carro. |
| Inadimplência / cobrança | Média | Status de assinatura + webhooks do gateway; suspensão automática conforme regra do plano. |

---

## 12. Roadmap (fases)

**Fase 0 — Fundação SaaS** 🔴
Multi-tenancy (schema com `tenant_id` + **RLS**), Supabase Auth com claims de tenant/papel, deploy Docker/Portainer, Evolution API multi-instância. Estrutura de `tenants`/`usuarios`/`tenant_usuarios`.

**Fase 1 — MVP (resolve a dor urgente, já multi-tenant)** 🔴
Negócios/carros + fotos; contatos com opt-in + CSV; motor de campanha (template + throttling + log); página pública do carro; onboarding básico (criar tenant, conectar WhatsApp, importar contatos). **Piloto: Carvalho Júnior como tenant 0.**

**Fase 2 — Camada comercial**
Planos, limites/entitlements, metering de envios, billing (gateway BR), back-office/super-admin, white-label.

**Fase 3 — Gestão financeira**
Dashboard DRE, centros de custo/lançamentos, captação/ROI por canal.

**Fase 4 — Jurídico + contratos**
Acordos + pagamentos; contrato em PDF.

**Fase 5 — Escala WhatsApp**
Integração da **Cloud API oficial** como provider alternativo; onboarding de WABA por tenant.

> **Nota:** o piloto valida produto e distribuição já na base multi-tenant; a monetização (Fase 2) entra assim que houver 2º tenant pagante.

---

## 13. Modelo comercial (SaaS)

- **Estrutura de planos** (preços a definir): **Starter** (1 número, X contatos, Y envios/mês, módulos básicos), **Pro** (mais usuários/contatos/envios, dashboard/ROI completos), **Agência/White-label** (marca própria, multi-cliente, revenda).
- **Cobrança:** recorrente mensal via gateway BR (PIX/boleto/cartão); excedente de envios faturável.
- **Custos de infraestrutura:** VPS/cloud + eventual custo por conversa na Cloud API (repassado no plano).
- **Go-to-market (Era Digital):** venda direta a repassadores e **add-on de pacotes da agência**; network do segmento (repassadores, lojistas) para expansão; white-label para revender sob outras marcas.

---

## 14. Pendências / próximos passos

- [ ] **Financeiro (Era Digital)** — planilha preenchida (carro/valor fictício) para validar campos e casos de borda.
- [ ] **Alessandro** — exemplo do **anúncio padrão** (texto + foto) para calibrar o template.
- [ ] **Definir** provedor de WhatsApp da Fase 1 (Evolution) e validar licenciamento; decidir critério de migração para Cloud API.
- [ ] **Definir** gateway de billing (Asaas / Iugu / Pagar.me) e estrutura de planos/preços.
- [ ] **Definir** estratégia de white-label (subdomínio vs. domínio custom).
- [ ] **Validar** este PRD com os stakeholders antes de implementar.

---

## Apêndice A — Mapeamento planilha → módulos

| Aba da planilha | Vira no CRM |
|---|---|
| `JUNHO` (transacional) | Módulo 1 — Negócios (tabela única `negocios`) |
| `Dashboard Geral 2026` | Módulo 4 — Dashboard (views) |
| `Custos Operacionais` | Módulo 6 — Centros de custo |
| `Não Operacional Detalhado` | Módulo 6 — Lançamentos de custo |
| `Captação de Vendas` | Módulo 5 — ROI por canal |
| `Acordos` (formato livre) | Descartada em favor da versão normalizada |
| `Controle de Acordos` | Módulo 7 — Acordos |
| `Pagamento Acordos` | Módulo 7 — Pagamentos de acordo |
| *(inexistente)* | Módulo 2 — Contatos (novo) |
| *(inexistente)* | Módulo 3 — Campanhas WhatsApp (novo) |
| *(inexistente)* | Módulos 9–12 — Camada SaaS (multi-tenant, planos, back-office, onboarding) |

## Apêndice B — Decisão de isolamento multi-tenant

**Escolhido:** banco único + `tenant_id` + **RLS**. Motivo: menor custo/operação, isolamento imposto no banco, ótimo encaixe com Supabase. **Rejeitado por ora:** schema-por-tenant (complexidade de migração/manutenção) e banco-por-tenant (isolamento físico, mas overhead alto) — reconsiderar apenas para exigências enterprise específicas.

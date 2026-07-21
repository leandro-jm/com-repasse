---
type: spec
issue_type: feature
category: feature
status: done
domain: campanhas
owner: Produto (Niflow)
branch: feat/campanhas-whatsapp
created: 2026-07-17
updated: 2026-07-17
---

> **Spec as-built (retrospectiva).** Reconstruída do código existente em 2026-07-17. Módulo de **prioridade máxima** do produto. Aceite formal pendente.

# [CAMPANHAS] Motor de campanhas WhatsApp ("carro novo")

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

A distribuição de "carro novo" no WhatsApp é a dor nº 1 (PRD §1.1): lista de transmissão bloqueada pela Meta, grupos ignorados, e o lojista não troca de número (a credibilidade está nele). Ele precisa disparar para a base enxuta de compradores reais, de forma confiável e com throttling, sem tomar ban.

### 1.2 Objetivo

Disparar um anúncio de carro novo para os contatos elegíveis, com throttle, metering por plano e log por destinatário — sem bloquear o usuário e respeitando LGPD.

### 1.3 Contexto de negócio

Módulo de maior prioridade (PRD §1.1, §7.4). Consome a base de [spec-contatos-base-optin](spec-contatos-base-optin.md) e um negócio de [spec-negocios-gestao-carros](spec-negocios-gestao-carros.md). Depende da abstração de provider ([ADR-0004](../adr/adr-0004-provider-whatsapp-por-tenant.md)) e do worker/metering ([ADR-0006](../adr/adr-0006-worker-campanhas-metering-atomico.md)).

### 1.4 Regras de negócio

- RN-01 (RB5): elegível = contato com `opt_in_whatsapp = true` e `ativo = true`.
- RN-02 (RB8): um disparo só ocorre se `uso_mensal.envios + destinatários ≤ plano.limite_envios_mes`; senão, bloqueia/avisa. A cota é **reservada atomicamente no enqueue** (`reservar_envios`), liberada no rollback (`liberar_envios`).
- RN-03: cada mensagem leva rodapé de opt-out LGPD (`{PUBLIC_APP_URL}/sair/{contato_id}`) e a foto de capa do negócio.
- RN-04: envio com throttle aleatório `CAMPAIGN_THROTTLE_MIN_MS..MAX_MS` (default 4000..12000).
- RN-05: cada destinatário tem status próprio (`pendente`/`enviado`/`falha`); falha isolada não derruba o lote (poison-pill).

### 1.5 Métricas e indicadores

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
| Taxa de entrega | enviados ÷ destinatários | alta | — | baixa |
| Envios no mês vs. limite | `uso_mensal.envios` ÷ `limite_envios_mes` | < 80% | 80–100% | estourado |

### 1.6 Escopo

ENTRA: criação de campanha "novo carro" a partir de um negócio, seleção de elegíveis, reserva de cota, fila + worker com throttle, log por destinatário, rodapé de opt-out.
NÃO ENTRA: campanhas com segmentação avançada/A-B; chat 1:1; agendamento futuro (dispara na criação).

### 1.7 Stakeholders

- Quem pediu: lojista. Quem valida: Produto. Quem usa: Operador.

### 1.8 Critérios de aceite (visão PM)

- [x] Disparar para elegíveis sem bloquear a tela.
- [x] Respeitar o limite do plano (bloquear/avisar ao estourar).
- [x] Rodapé de opt-out em toda mensagem.

### 1.9 Questões em aberto (clarify)

Não se aplica (as-built).

> **GATE PM → UX** — `Aprovado por (design): — (as-built, pendente)`

## FASE 2 — DESIGN

### 2.1 Personas e cenários de uso

Operador que acabou de cadastrar um carro e quer avisar a base na hora, do celular.

### 2.2 Fluxo do usuário

Negócio → "disparar campanha" → sistema seleciona elegíveis e mostra quantos/limite → confirma → fila criada (status por destinatário) → worker envia com throttle em background → operador acompanha stats.

### 2.3 Protótipo

- Alta: `apps/web/src/pages/Campanhas.tsx`.

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
| Card/Badge/Progress/Toast | sim | `components/ui/` |

### 2.5 Estados e edge cases

- Limite estourado: bloqueia com aviso claro (RB8).
- `api_key` do Evolution inválido: aquele envio falha, a fila continua (poison-pill).
- Sem elegíveis: nada a disparar, avisa.
- Crash do worker no meio: claim órfão recuperado após 5 min (idempotente).

### 2.6 Critérios de aceite (visão UX)

- [x] Prévia de destinatários e limite antes de disparar.
- [x] Acompanhamento de status por campanha.

`Aprovado por (design): — (as-built, pendente)`

> **GATE UX → TECH** — ver nota as-built.

## FASE 3 — TECH REVIEW

### 3.1 Viabilidade

Stack atual; provider WhatsApp abstraído; worker dedicado. Risco documentado: ToS/ban do Evolution não-oficial (PRD §11) — mitigado pela abstração e migração planejada para Cloud API.

### 3.2 Arquitetura

- Enqueue: `apps/api/src/routes/campanhas.ts` (`POST /campanhas/novo-carro`) — seleciona elegíveis, chama `reservar_envios(n)`, insere `campanhas` + `campanha_envios (pendente)`, rollback com `liberar_envios(n)`.
- Worker: `apps/worker/src/index.ts` — polling, `BATCH=20`, claim atômico por linha, throttle aleatório, rodapé opt-out + foto de capa, provider via `criarProvider` (`apps/worker/src/providers/whatsapp.ts`).
- Schema: `campanhas`, `campanha_envios` (índice parcial de pendentes) em `20260701000100_crm_core.sql`; `reservar_envios`/`liberar_envios` em `20260704000100_bugfixes_envios_publico.sql`; `uso_mensal` (metering) em `20260701000000_saas_core.sql`.
- Templates: `TEMPLATE_PADRAO_ANUNCIO`, `montarMensagem` (`packages/shared/src/whatsapp.ts`).

### 3.3 Decisões técnicas

Metering reservado no enqueue, não no envio ([ADR-0006](../adr/adr-0006-worker-campanhas-metering-atomico.md)); provider por tenant, `api_key` cifrado ([ADR-0004](../adr/adr-0004-provider-whatsapp-por-tenant.md), [ADR-0005](../adr/adr-0005-segredos-cifrados-por-tenant.md)); guarda SSRF nas chamadas de saída ([ADR-0011](../adr/adr-0011-defesa-em-profundidade-jwt-ssrf.md)).

### 3.4 Estimativa de complexidade

Alta — fila, worker idempotente, metering atômico, dois providers, throttle, LGPD.

### 3.5 Critérios de aceite (visão Tech)

- [x] Reserva atômica de cota; sem contagem dupla.
- [x] Claim idempotente; recuperação de órfãos.
- [x] SSRF bloqueado; `api_key` nunca no browser.

`Aprovado por (tech): — (as-built, pendente)`

> **GATE TECH → IMPL** — ver nota as-built.

## FASE 4 — IMPLEMENTAÇÃO

### 4.1 O que foi implementado

Motor completo: enqueue com reserva atômica, fila `campanha_envios`, worker com throttle e claim idempotente, dois providers (Evolution/Cloud API), rodapé opt-out, foto de capa, stats por campanha.

### 4.2 Desvios do planejado

`reservar_envios`/`liberar_envios` foram introduzidos em migration de bugfix (`20260704000100`) para tornar a reserva atômica — correção sobre a primeira versão do metering.

### 4.3 Validação (QA)

- [x] RB5 (elegibilidade) e RB8 (limite) exercitados.
- [x] Poison-pill: envio com credencial ruim não derruba o lote.
- [x] Rodapé de opt-out presente e funcional (rota pública).

Validado por: — · 2026-07-17 · registro as-built

> **GATE DONE** — entregue; registro retrospectivo.

## FASE FINAL — ACEITE

Registro as-built (retrospectivo) — reconstruído do código em 2026-07-17. Aceite formal pendente.

`Aprovado por (done): — (as-built, pendente)`

### Data de conclusão

Entregue antes de 2026-07-17.

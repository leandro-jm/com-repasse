---
type: adr
id: ADR-0006
status: aceita
domain: campanhas
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-campanhas-whatsapp, spec-planos-assinaturas]
---

# ADR-0006 — Worker assíncrono de campanhas + metering atômico no enqueue

## Contexto

Um disparo de campanha atinge dezenas/centenas de contatos, precisa de throttling (pra não parecer spam e reduzir risco de ban) e não pode bloquear a requisição HTTP. Além disso, o plano do tenant tem limite mensal de envios (RB8) — contar errado (a mais ou a menos) quebra a cobrança e a confiança. Um crash no meio de um lote não pode reenviar mensagens já enviadas nem perder as pendentes.

## Decisão

**Fila `campanha_envios` consumida por um worker dedicado, com o metering (RB8) reservado atomicamente no momento do enqueue — não no envio.**

- No enqueue (`apps/api/src/routes/campanhas.ts`, `POST /campanhas/novo-carro`): seleciona contatos elegíveis (`opt_in_whatsapp && ativo`, RB5), reserva a cota via RPC atômico **`reservar_envios(n)`**, insere `campanhas` + `campanha_envios` (status `pendente`); em falha, faz rollback com **`liberar_envios(n)`**.
- O worker (`apps/worker/src/index.ts`) é um loop de polling (sem HTTP), usa service-role (bypassa RLS pra processar todos os tenants), pega lotes de até `BATCH=20` pendentes, faz **claim atômico por linha** (`claimed_at` guardado por `status='pendente'` e claim órfão > 5min é recuperado — idempotente), envia via provider ([ADR-0004](adr-0004-provider-whatsapp-por-tenant.md)) com **throttle aleatório** `CAMPAIGN_THROTTLE_MIN_MS..MAX_MS` (default 4000..12000), anexa rodapé de opt-out LGPD e a foto de capa, e marca `enviado`/`falha`.
- **Metering NÃO é feito no worker** — foi reservado no enqueue pra evitar contagem dupla.

## Alternativas consideradas

- **Enviar síncrono na request HTTP** — timeout, sem throttle, bloqueia o usuário. Rejeitado.
- **Contar envios no worker (no momento do envio)** — sujeito a contagem dupla em retry/claim órfão. Rejeitado; reserva no enqueue é a fonte de verdade.
- **Fila externa (Redis/SQS)** — mais infra pra manter; a tabela Postgres com claim atômico basta no tamanho atual.

## Consequências

### Positivas

- Disparo não bloqueia o usuário; throttle reduz risco de ban.
- Metering correto e à prova de retry (RB8) — reserva atômica, liberação no rollback.
- Worker idempotente: crash no meio do lote recupera claims órfãos sem reenviar.

### Negativas · trade-offs

- Um serviço a mais pra operar (`worker` no Docker).
- Polling tem latência mínima (não é push); aceitável pro caso de uso.
- A separação enqueue-reserva / worker-envio exige disciplina: falha de envio não devolve cota (a mensagem foi "gasta" na tentativa) — comportamento documentado.

## Referências

- PRD `PRD_CRM_Carvalho_Junior.md §7.4`, regras RB5/RB8 (§8)
- `apps/api/src/routes/campanhas.ts`, `apps/worker/src/index.ts`
- `supabase/migrations/20260704000100_bugfixes_envios_publico.sql` (`reservar_envios`, `liberar_envios`)
- Specs: `docs/specs/spec-campanhas-whatsapp.md`

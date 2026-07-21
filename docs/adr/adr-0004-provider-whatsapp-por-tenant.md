---
type: adr
id: ADR-0004
status: aceita
domain: whatsapp
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-campanhas-whatsapp, spec-onboarding-whitelabel]
---

# ADR-0004 — Abstração de provider WhatsApp, instância por tenant

## Contexto

O motor de campanhas WhatsApp é a dor nº 1 do cliente (PRD §1.1) e o módulo de maior prioridade. Cada tenant tem o **seu** número (a credibilidade está atrelada a ele) e não vai trocá-lo. Existem dois mundos de integração: o não-oficial (Baileys/Evolution, sem custo por mensagem, com risco de ban/ToS) e o oficial (WhatsApp Cloud API, com custo por conversa, sem risco de ban). Precisamos começar barato (piloto) sem travar a migração para o oficial na hora de escalar.

## Decisão

**Abstração `WhatsAppProvider` sobre dois backends, com a instância/conexão por tenant** guardada em `whatsapp_instances` (nunca em env).

- Interface `WhatsAppProvider` com `EvolutionProvider` (Evolution API v2 / Baileys, header `apikey`, `message/sendText`/`sendMedia`) e `CloudApiProvider` (Graph `v20.0`, `Authorization: Bearer`, `{phone_number_id}/messages`). Fábrica `criarProvider(conn, provider)` decide por `evolution | cloud_api` (`apps/worker/src/providers/whatsapp.ts`).
- Provisionamento/QR/status por tenant via `apps/api/src/routes/whatsapp.ts` (`instance/create` com `integration: WHATSAPP-BAILEYS`, `instance/connect`, `instance/connectionState`).
- O `api_key` do Evolution é cifrado em repouso ([ADR-0005](adr-0005-segredos-cifrados-por-tenant.md)) e nunca volta ao browser (a API só devolve `tem_api_key: bool`).
- Toda chamada de saída passa pela guarda SSRF ([ADR-0011](adr-0011-defesa-em-profundidade-jwt-ssrf.md)).

MVP/piloto usam Evolution; a migração para Cloud API (por tenant, com WABA) é o caminho recomendado de escala (roadmap Fase 5).

## Alternativas consideradas

- **Só Evolution (Baileys)** — sem custo por mensagem, mas ban em escala multiplicaria o risco por cliente. Bom pro MVP, insuficiente pra escala.
- **Só Cloud API oficial** — sem risco de ban, mas custo por conversa e onboarding de WABA por tenant desde o dia 1; caro pro piloto. Adiado como destino, não como início.
- **Acoplar direto ao Evolution sem abstração** — travaria a migração. Rejeitado.

## Consequências

### Positivas

- Começa barato (Evolution) e migra pra oficial sem reescrever o motor de campanhas.
- Cada tenant tem sua sessão/número isolados.
- Provider é detalhe de configuração do tenant, não de código.

### Negativas · trade-offs

- Manter dois providers e o contrato entre eles.
- Evolution auto-hospedado significa operar N sessões WhatsApp Web (risco ToS/ban, custo operacional) — risco documentado (PRD §11).
- A conexão/QR por tenant adiciona um fluxo de onboarding que precisa monitoramento de saúde (back-office).

## Referências

- PRD `PRD_CRM_Carvalho_Junior.md §7.4`, §11
- `apps/worker/src/providers/whatsapp.ts` (`EvolutionProvider`, `CloudApiProvider`, `criarProvider`)
- `apps/api/src/routes/whatsapp.ts`, `supabase/migrations/20260701000000_saas_core.sql` (`whatsapp_instances`, enum `provider_whatsapp`)
- Specs: `docs/specs/spec-campanhas-whatsapp.md`

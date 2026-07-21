---
type: adr
id: ADR-0005
status: aceita
domain: seguranca
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-campanhas-whatsapp, spec-tenants-iam-rbac]
---

# ADR-0005 — Segredos por tenant cifrados em repouso (AES-256-GCM)

## Contexto

Cada tenant configura a conexão com seu servidor Evolution, incluindo um `api_key` ([ADR-0004](adr-0004-provider-whatsapp-por-tenant.md)). Esse segredo fica no banco (`whatsapp_instances`). Guardá-lo em texto puro significaria que qualquer acesso ao banco (dump, backup, super-admin, incidente) exporia as credenciais de WhatsApp de todos os tenants.

## Decisão

**Cifrar segredos de tenant em repouso com AES-256-GCM**, chave derivada por SHA-256 de `APP_ENCRYPTION_KEY` (`packages/shared/src/cripto.ts`). Ciphertext prefixado com `enc:v1:`.

- `APP_ENCRYPTION_KEY` é **obrigatória em produção**: `assertEncryptionKeyConfigured()` lança no boot se ausente (`NODE_ENV=production`), tanto na API quanto no worker.
- A API cifra na escrita e **nunca devolve** o `api_key` ao browser — só expõe `tem_api_key: bool` (`apps/api/src/routes/whatsapp.ts`).
- O worker decifra sob demanda para enviar (`apps/worker/src/index.ts`).
- Função node-only (`node:crypto`) — vive na camada de servidor, coerente com [ADR-0002](adr-0002-arquitetura-tres-camadas-api.md).

## Alternativas consideradas

- **Texto puro no banco** — simples, mas expõe segredos em qualquer dump/backup. Rejeitado.
- **KMS gerenciado (ex.: cloud KMS)** — rotação e custódia melhores, mas dependência/custo externos desnecessários agora. Adiado; o prefixo `enc:v1:` deixa espaço pra versionar o esquema se migrarmos.
- **Vault dedicado** — overkill pro tamanho atual.

## Consequências

### Positivas

- Um dump de banco não expõe credenciais de WhatsApp.
- Segredo nunca trafega pro cliente.
- Esquema versionado (`enc:v1:`) permite evoluir sem quebrar o que já existe.

### Negativas · trade-offs

- `APP_ENCRYPTION_KEY` vira segredo crítico de operação — **rotacioná-la invalida todos os segredos cifrados** (exige re-cadastro das conexões). Precisa de custódia e processo de rotação.
- A API não pode bootar em produção sem a chave (falha explícita — por design).
- Chave única para todos os tenants (não é envelope por-tenant) — trade-off de simplicidade.

## Referências

- `packages/shared/src/cripto.ts` (`enc:v1:`, `assertEncryptionKeyConfigured`)
- `apps/api/src/env.ts` (assert no import), `infra/README.md` (`APP_ENCRYPTION_KEY` obrigatória)
- `apps/api/src/routes/whatsapp.ts`, `apps/worker/src/index.ts`
- Specs: `docs/specs/spec-campanhas-whatsapp.md`

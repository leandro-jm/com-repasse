---
type: adr
id: ADR-0011
status: aceita
domain: seguranca
deciders: Arquitetura (Niflow)
created: 2026-07-17
updated: 2026-07-17
supersedes: —
superseded_by: —
related_specs: [spec-campanhas-whatsapp, spec-backoffice-superadmin, spec-tenants-iam-rbac]
---

# ADR-0011 — Defesa em profundidade: JWT validado server-side + guarda SSRF

## Contexto

A API broca todas as chamadas ([ADR-0002](adr-0002-arquitetura-tres-camadas-api.md)) e faz **chamadas de saída para servidores Evolution informados pelo próprio tenant** (URL configurável em `whatsapp_instances`). Duas superfícies de risco: (1) confiar em um JWT sem validá-lo abriria a porta pra tokens forjados/expirados; (2) uma URL de Evolution controlada pelo tenant poderia apontar pra rede interna (`169.254.169.254`, `localhost`, IPs privados) — clássico SSRF.

## Decisão

**Múltiplas camadas, cada uma independente:**

1. **JWT validado no servidor** a cada request: `requireAuth` extrai o Bearer, mas **valida via `db.auth.getUser()`** (rejeita expirado/adulterado) antes de montar os `Claims` (`apps/api/src/middleware/auth.ts`). Não confia no payload decodificado sozinho.
2. **RLS como rede final** ([ADR-0001](adr-0001-isolamento-multitenant-rls.md)) — mesmo com a API correta, o banco filtra por tenant.
3. **Guarda SSRF** (`apps/api/src/ssrf.ts`, `assertUrlPublica()`) aplicada **tanto ao salvar a config quanto em cada chamada de saída** ao Evolution (`apps/api/src/routes/whatsapp.ts`) — bloqueia hosts privados/loopback/link-local.
4. **Segredos cifrados** ([ADR-0005](adr-0005-segredos-cifrados-por-tenant.md)) e nunca devolvidos ao browser.
5. **Super-admin auditado**: impersonation registrada em `audit_log` (`impersonar_tenant`/`parar_impersonacao`), com policy própria — a única forma de cruzar tenants.

## Alternativas consideradas

- **Confiar no JWT decodificado (sem `getUser()`)** — mais rápido, mas aceitaria token adulterado/expirado. Rejeitado.
- **Só RLS, sem validação na API** — deixaria a API processar requests inválidos até o banco barrar; melhor barrar cedo. Complementar, não substituto.
- **Allowlist de hosts Evolution em vez de guarda SSRF** — engessaria o self-host por tenant; a guarda por classe de IP é mais flexível e segura.

## Consequências

### Positivas

- Token forjado/expirado é barrado na porta; SSRF via URL de tenant é bloqueado.
- Camadas independentes: falhar uma não abre o sistema (defense-in-depth).
- Ações de super-admin são rastreáveis (auditoria).

### Negativas · trade-offs

- `getUser()` por request adiciona uma ida ao Auth (latência) — trade-off aceito por segurança.
- A guarda SSRF precisa cobrir todos os caminhos de saída novos (disciplina ao adicionar integrações).
- Auditoria de impersonation precisa ser revisada/retida conforme LGPD.

## Referências

- `apps/api/src/middleware/auth.ts`, `apps/api/src/ssrf.ts`, `apps/api/src/routes/whatsapp.ts`
- `supabase/migrations/20260702000000_finalizacoes.sql` (`registrar_auditoria`, `impersonar_tenant`)
- PRD `PRD_CRM_Carvalho_Junior.md §11` (riscos)
- Specs: `docs/specs/spec-backoffice-superadmin.md`

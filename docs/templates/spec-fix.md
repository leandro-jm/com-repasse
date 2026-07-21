---
type: spec
issue_type: bug
category: fix
status: discovery | approved | implementing | done
domain: <dominio>
owner: <quem está com a bola>
branch: fix/<slug>
created: <data>
updated: <data>
---

<!-- Template de spec-fix (padrão SDD). Copie para docs/specs/spec-<dominio>-<slug>.md
e preencha. Fix é direto: sem fase de design nem tech review. 3 fases (discovery
reduzida, implementação, aceite). Trabalho todo na branch fix/<slug>; chega à main
por PR com merge (a aprovação do PR é a assinatura do done). -->

# [DOMÍNIO] Nome do defeito

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

O que está quebrado? Como reproduz? Quem é afetado e qual o impacto? Dado ou print que comprova, se tiver.

### 1.2 Causa raiz

O que está causando o defeito. Se ainda não se sabe, registrar a hipótese e marcar como a confirmar.

### 1.3 Correção proposta

O que vai ser feito para corrigir. Sem inventar mudança de comportamento além do necessário — fix corrige, não redesenha.

### 1.4 Critérios de aceite

- [ ] O defeito não reproduz mais no cenário descrito em 1.1
- [ ] Nenhuma regressão introduzida
- [ ] ...

### 1.5 Aprovação do despacho (ato humano)

Fix é fast lane, mas despachar correção para produção ainda é juízo humano — o responsável confere problema, causa e correção proposta antes de liberar.

`Aprovado por (despacho): <quem> · <data>`

> **GATE QUALITY** — Valida que o problema (1.1) está documentado, que há critérios de aceite verificáveis (1.4) **e** que a linha `Aprovado por (despacho):` está preenchida e salva. Sem isso, não avança. Status muda para `approved` e depois `implementing`.

## FASE 4 — IMPLEMENTAÇÃO (registro pós-implementação)

### 4.1 O que foi corrigido

Resumo do que foi entregue.

### 4.2 Desvios do planejado

Algo mudou durante a correção? Registrar.

### 4.3 Validação (QA)

- [ ] O cenário de 1.1 não reproduz mais — como foi conferido
- [ ] Regressão verificada: o que estava em volta continua funcionando

Validado por: <quem> · <data> · <evidência>

> **GATE DONE** — Valida que 4.3 está preenchido. No fluxo PR, a assinatura do done É a aprovação + merge do PR no GitHub: pós-merge, registrar `Aprovado por (done): <usuário> via PR #<n> · <data>` (nº real, nunca antecipado) e, em edição separada, avançar o status para `done`.

## FASE FINAL — ACEITE

### Aceite da entrega (ato humano)

`Aprovado por (done): <quem> · <data>`

### Data de conclusão

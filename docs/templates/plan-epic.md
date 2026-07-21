---
type: epic
status: open | doing | done
owner: <quem coordena>
created: <data>
updated: <data>
---

<!-- Template de plan tipo EPIC (padrão SDD). Copie para docs/plans/plan-<slug>.md.
Épico é guarda-chuva: agrega entregas-filhas (feature/bug), dá sequência e status
agregado. NÃO vira código sozinho — quem vira código são as specs filhas. Use épico
quando o trabalho atravessa mais de uma persona/camada, mais de uma sessão, ou tem
dependência entre entregas. -->

# [EPIC] Nome do épico

## Objetivo

Em uma frase: que resultado de negócio este épico entrega quando todas as entregas-filhas fecharem?

## Contexto

Por que agora? Link pro PRD / ADR relacionado quando existir.

## Escopo do épico

ENTRA:
- ...

NÃO ENTRA:
- ...

## Decomposição em entregas

Cada entrega vira uma spec própria (`docs/specs/spec-<dominio>-<slug>.md`). Liste e linke conforme forem nascendo.

| Entrega | Classe | Depende de | Status |
|---|---|---|---|
| <slug> | feature | — | discovery |

## Sequência e dependências

Ordem de ataque e o que bloqueia o quê. Uma ou duas linhas.

## Status agregado

Resumo em 1–2 linhas: quantas entregas abertas/feitas e onde está o gargalo. Atualizar conforme o épico anda.

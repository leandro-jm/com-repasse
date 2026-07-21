---
type: spec
issue_type: feature
category: feature
status: discovery | designing | tech-review | approved | implementing | done
domain: <dominio>
owner: <quem está com a bola>
branch: feat/<slug>
created: <data>
updated: <data>
---

<!-- Template de spec-feature (padrão SDD, adaptado ao app-crm-carros). Copie para
docs/specs/spec-<dominio>-<slug>.md e preencha fase a fase. A spec cresce conforme
passa pelo pipeline; cada gate é validado antes de avançar. 4 fases: discovery,
design, tech-review, implementação. Trabalho todo na branch feat/<slug>; chega à
main por PR com merge (a aprovação do PR é a assinatura do done). -->

# [DOMÍNIO] Nome da demanda

## FASE 1 — DISCOVERY (PM preenche)

### 1.1 Problema

O que está acontecendo hoje que justifica esse trabalho? Quem sofre? Qual o impacto? Dado que comprova, se tiver.

### 1.2 Objetivo

Em uma frase: o que muda quando isso for entregue?

### 1.3 Contexto de negócio

O contexto de domínio que embasa a demanda. Aponte a fonte quando existir (ex.: `PRD_CRM_Carvalho_Junior.md §X`, ADR relacionado em `docs/adr/`).

### 1.4 Regras de negócio

Cada regra numerada. Sem ambiguidade. Com fonte quando tiver (as regras RB1–RB9 do PRD §8 vivem em `packages/shared/src/regras.ts`).

- RN-01: ...
- RN-02: ...

### 1.5 Métricas e indicadores

O que vai ser medido? Como calcula? Qual threshold? Se não tiver métricas, escrever "Não se aplica" — não deixar vazio.

| Indicador | Fórmula | Bom | Regular | Crítico |
| --------- | ------- | --- | ------- | ------- |
|           |         |     |         |         |

### 1.6 Escopo

ENTRA:

- ...

NÃO ENTRA:

- ...

### 1.7 Stakeholders

- Quem pediu:
- Quem valida:
- Quem usa:

### 1.8 Critérios de aceite (visão PM)

- [ ] ...

### 1.9 Questões em aberto (clarify)

Toda ambiguidade conhecida vira uma linha aqui, e é resolvida **antes** do design — pergunta respondida vira regra (RN-xx) com fonte, ou premissa assumida com dono. Se não há questões, escrever "Não se aplica".

| #   | Questão | Resposta / premissa assumida | Quem respondeu · data |
| --- | ------- | ---------------------------- | --------------------- |
| Q1  |         |                              |                       |

> **GATE PM → UX** — Valida que 1.1 a 1.9 estão preenchidos e sem seção vazia, e que nenhuma questão de 1.9 está sem resposta ou premissa. Sem isso, não avança. Status muda para `designing`.

## FASE 2 — DESIGN (Designer preenche)

### 2.1 Personas e cenários de uso

Quem usa, em que contexto, qual a jornada.

### 2.2 Fluxo do usuário

Passo a passo de como o usuário navega. Texto, diagrama Mermaid, ou link pra tela.

### 2.3 Protótipo

Registrar a fidelidade e o link/path:

- Baixa: descrição textual ou wireframe neste próprio arquivo
- Alta: tela real em `apps/web/src/pages/<Página>.tsx` — indicar rota

### 2.4 Componentes do Design System usados

| Componente | Existe no DS? | Observação |
| ---------- | ------------- | ---------- |
|            |               |            |

### 2.5 Estados e edge cases

- Sem dados: o que mostra?
- Erro de API: como degrada?
- Mobile/responsivo: como adapta?
- Permissão: quem não pode ver? (RBAC — papel no tenant)

### 2.6 Critérios de aceite (visão UX)

- [ ] Fluxo validado com stakeholder
- [ ] Protótipo aprovado (indicar fidelidade)
- [ ] Componentes do DS mapeados
- [ ] Edge cases cobertos

`Aprovado por (design): <quem> · <data>`

> **GATE UX → TECH** — Valida que 2.1 a 2.6 estão preenchidos **e** que a linha `Aprovado por (design):` está preenchida e salva (aprovação é ato humano; a linha preexiste à mudança de status). Sem os dois, não avança. Status muda para `tech-review`.

## FASE 3 — TECH REVIEW (Engineer preenche)

### 3.1 Viabilidade

Pode ser feito com a stack atual? Precisa de dependência nova? Riscos técnicos.

### 3.2 Arquitetura

Endpoints necessários (rotas em `apps/api/src/routes/`), payloads, contratos de API. Impacto em schema existente (migrations em `supabase/migrations/`) e RLS.

### 3.3 Decisões técnicas

Se tomou decisão não-trivial, registrar aqui — e, se for estrutural, abrir/linkar um ADR em `docs/adr/`.

### 3.4 Estimativa de complexidade

Baixa / Média / Alta — justificativa em uma linha.

### 3.5 Critérios de aceite (visão Tech)

- [ ] typecheck limpo (`tsc --noEmit` / `pnpm lint`)
- [ ] Testes passando (`pnpm test`)
- [ ] Sem vulnerabilidade nova (SSRF/segredos/RLS respeitados)
- [ ] API segue contrato documentado

`Aprovado por (tech): <quem> · <data>`

> **GATE TECH → IMPL** — Valida 3.1 a 3.5 **e** que a linha `Aprovado por (tech):` está preenchida e salva. Sem a linha, não despacha. Status muda para `approved` e depois `implementing`.

## FASE 4 — IMPLEMENTAÇÃO (registro pós-implementação)

### 4.1 O que foi implementado

Resumo do que foi entregue, com os arquivos-chave tocados.

### 4.2 Desvios do planejado

Algo mudou durante a implementação? Registrar.

### 4.3 Validação (QA)

Evidência de que os critérios de aceite foram exercitados de verdade — não só typecheck verde. Quem validou, como, e contra o quê:

- [ ] Critérios de aceite do PM (1.8) verificados um a um — como cada um foi conferido
- [ ] Números batem com a validação de dados, quando aplicável
- [ ] Edge cases do design (2.5) exercitados: sem dados, erro de API, permissão
- [ ] Regressão: o que já existia continua funcionando

Validado por: <quem> · <data> · <evidência>

> **GATE DONE** — Valida que 4.3 está preenchido. No fluxo PR, a assinatura do done É a aprovação + merge do PR no GitHub: pós-merge, registrar `Aprovado por (done): <usuário> via PR #<n> · <data>` (nº real, nunca antecipado) e, em edição separada, avançar o status para `done`.

## FASE FINAL — ACEITE

### Aceite da entrega (ato humano)

Aceitar a entrega é juízo do dono do domínio.

`Aprovado por (done): <quem> · <data>`

### Data de conclusão

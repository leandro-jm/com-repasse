---
type: spec
category: ship
status: shipping
domain: <dominio>
owner: <quem pediu>
branch: feat/<slug>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---

<!-- Template de spec leve (fluxo rápido de ajuste). Copie para
docs/specs/spec-<dominio>-<slug>.md. Não tem fases de discovery/design/tech:
o que mudou foi iterado e validado na branch de trabalho.
Estados: shipping → done (gate humano). -->

# [DOMÍNIO] <título curto do ajuste>

## 1. O que mudou (gerado do diff `feat/<slug>` × `main`)

<!-- Lista objetiva, em linguagem de PM, por tela/componente. -->

- ...

## 2. Por quê

<!-- 1-3 linhas: a dor/motivação que originou a iteração. -->

## 3. Faxina de promoção

<!-- Regra de arquivo reescrito: TODO o conteúdo dele conta como novo —
"veio do arquivo antigo" não isenta. Item marcado exige evidência colada na
seção abaixo. -->

- [ ] Lógica nova do diff com teste (`pnpm test`); o que ficou de fora está em "Testes pendentes e por quê"
- [ ] Sem `console.log`, código morto ou experimento descartado no diff
- [ ] Sem `as` cego, sem hardcode temporal, sem dado real/PII
- [ ] Nenhuma dependência nova sem aprovação
- [ ] Segredos e RLS respeitados (nada de service-role no front; `api_key` nunca volta ao browser)
- [ ] `pnpm test` verde (colar resultado resumido)

### Evidências da faxina

<!-- Cole aqui a SAÍDA dos comandos que provam cada item marcado: grep de
strings/segredos (limpo), lista dos testes novos, resumo do verify. Sem
evidência = item não feito. -->

### Testes pendentes e por quê

<!-- O que não deu pra testar nesta promoção e a razão objetiva. -->

## 4. Validação e gate

Como foi validado: <tela/fluxo que o humano conferiu rodando>

`Aprovado por (done): <quem> · <data>`

> **GATE DONE (fluxo PR)** — A aprovação humana é o Approve + merge do PR na UI do
> GitHub. Pós-merge, a linha acima é preenchida com o registro factual
> `<usuário> via PR #<n> · <data>` e SÓ DEPOIS, em edição separada, o status
> avança para `done`. Fallback sem remote: assinatura manual do humano na linha + merge local.

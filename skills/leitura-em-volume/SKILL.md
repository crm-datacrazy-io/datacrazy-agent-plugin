---
name: leitura-em-volume
description: Ler muitos registros do Datacrazy sem errar o número - contar leads, negócios ou conversas, achar o primeiro ou o último registro, ler uma conversa inteira, percorrer listas grandes. Use quando o pedido envolver "quantos", "total", "todos", "o primeiro", "o mais antigo", "a conversa toda", exportar ou conferir a base.
---

# Leitura em volume

Uma listagem devolve só uma página. O tamanho da página nunca é o total da conta.

## Contar

1. Peça o total à API: `skipTotals=false` na listagem devolve `count`. Use `take=1` quando só o total importa.
2. Para leads com filtro, `POST /api/v1/crm/leads/count` devolve só a contagem.
3. Nunca some páginas à mão nem informe o tamanho de uma página como total.

## Primeiro, último, mais antigo

Use ordenação com `take=1`: `order[createdAt]=asc` traz o mais antigo, `desc` o mais novo. Não tente chegar ao fim com `skip`.

## Ir além de 10.000 registros

`skip` acima de 10000 devolve página vazia com `details.code: "skip-limit-exceeded"`. Página vazia depois de página cheia é teto, não fim. Continue por data: `order[createdAt]=desc` com `filter[createdAtLessOrEqual]` igual à data do último registro lido.

## Conversa inteira

`GET /api/v1/conversations/:id/messages` sem `take` devolve só as 20 mensagens mais recentes. Para resumir ou analisar a conversa toda, pagine com `take=100` e `skip` de 100 em 100 até vir uma página com menos de 100.

## Filtros

Filtro com nome que não existe é ignorado em silêncio e a API devolve tudo. Use só os nomes que `dc_search` mostra. Se o número parecer igual ao total da conta, o filtro não aplicou: diga isso em vez de informar o número.

## Limite

60 chamadas por minuto por rota, variando com o plano da conta. Se a leitura pedir dezenas de páginas, diga ao usuário quanto tempo leva antes de começar.

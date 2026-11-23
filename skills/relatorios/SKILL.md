---
name: relatorios
description: Consultar números e relatórios do Datacrazy - quantos leads, negócios ganhos e perdidos, valor em funil, desempenho de atendentes, atividades e atendimento por período. Use quando o usuário pedir totais, métricas, ranking, comparação ou resumo de um período.
---

# Relatórios e métricas

1. Defina o período. Sem período no pedido, use o mês atual e diga isso na resposta.
2. Ache a métrica com `dc_search` (ex.: "business metrics summary", "activities metrics attendants", "conversations metrics").
3. Nas rotas de métricas os filtros vão em `query.filter`, que a tool envia como `filter[...]`:

```json
{ "method": "GET", "path": "/api/v1/crm/...",
  "query": { "filter": { "startDate": "2026-01-01T00:00:00.000Z", "endDate": "2026-01-31T23:59:59.999Z", "pipelines": ["<id do funil>"] } } }
```

4. Para contagens simples, as listagens documentadas (`GET /api/v1/leads`, `GET /api/v1/businesses`) aceitam filtros e devolvem o total; peça `take: 1` quando só o total importa.
5. Responda com os números e o período, em texto ou tabela curta. Não despeje JSON.

Não some páginas à mão para chegar a um total: use o total devolvido pela API. Se a métrica pedida não existir no catálogo, diga isso e ofereça a mais próxima.

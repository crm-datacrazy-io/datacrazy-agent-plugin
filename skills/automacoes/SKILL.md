---
name: automacoes
description: Criar, editar, ativar, testar e investigar automações (flows) do Datacrazy. Use sempre que o pedido envolver automação, fluxo, gatilho, "quando acontecer X faça Y", régua de mensagens ou bot.
---

# Automações (flows)

As rotas de automação são internas: não fazem parte da API pública documentada e podem mudar. Diga isso ao usuário na resposta final.

## Sequência

1. Entenda o gatilho e os passos pedidos. Se faltar algo que só o usuário sabe (texto da mensagem, qual etapa, qual etiqueta), pergunte antes de criar.
2. Chame `dc_flow_blocks` (com `query` ou `type`). A resposta traz as **regras de montagem**, as **receitas prontas** e a lista de blocos. Se uma receita servir, peça-a com `recipe`.
3. Chame `dc_flow_blocks` com `names` para cada bloco escolhido. A resposta traz o schema de opções, as opções do bloco (por exemplo o canal de envio do bloco `chat`) e um `example` pronto. Copie a forma do `example`. Nunca invente nome de bloco nem opção.
4. Busque os IDs reais que os blocos pedem (etiqueta, etapa, funil, atendente, canal) com `dc_search` e `dc_call`. Nunca invente ID.
5. Crie com `POST /api/v1/crm/flows/mcp`, corpo `{ name, group, description, blocks }`. `group` é a pasta da automação.
6. Leia a resposta. `created: false` traz `errors[{ blockId, code, message }]` e nada foi salvo: corrija os blocos apontados e envie de novo. Só diga que criou quando `created` for `true`.
7. A automação nasce **desativada**. Conte ao usuário o que foi montado e pergunte se pode ativar. Só ative depois do sim.

## Forma dos blocos

Cada bloco é `{ id, type, options }`. O item `{ name, options }` de cada passo vai dentro da lista do tipo do bloco, nunca direto em `options`:

| type | lista em options | ligações |
|---|---|---|
| `trigger` | `triggers` | `nextBlockId` |
| `action` | `actions` | `nextBlockId`, `errorNextBlockId` |
| `condition` | `conditions` | `trueNextBlockId`, `falseNextBlockId` |
| `chat` | `messages` | `nextBlockId`, `errorNextBlockId` |
| `delay` | `delay` (um objeto, não lista) | `nextBlockId` |

```json
[
  { "id": "t1", "type": "trigger",
    "options": { "triggers": [{ "name": "lead-tag-added-trigger", "options": { "tagIds": ["<id da etiqueta>"] } }], "nextBlockId": "c1" } },
  { "id": "c1", "type": "chat",
    "options": { "instanceId": "<id do canal>", "platform": "<plataforma do canal>", "provider": "<provedor do canal>",
                 "messages": [{ "name": "send-text-message", "options": { "text": "Olá, {leadFirstName}!" } }],
                 "nextBlockId": "" } }
]
```

- Existe exatamente um bloco `trigger`. `nextBlockId` vazio encerra o fluxo.
- No bloco `chat`, `instanceId`, `platform` e `provider` escolhem o canal de envio e vão juntos, com os valores do canal encontrado. Sem eles a mensagem sai pelo canal atual do contato.

## Outras operações

| Objetivo | Chamada |
|---|---|
| Listar automações | `GET /api/v1/crm/flows/mcp/list` (query `search`, `limit`) |
| Ler uma automação | `GET /api/v1/crm/flows/mcp/:id` |
| Editar os blocos | `POST /api/v1/crm/flows/mcp/:id/versions` com `{ blocks }` (lista completa; se a automação está ativa, a mudança vale na hora) |
| Ativar | `GET /api/v1/crm/flows/:id` para pegar `lastVersion.id`, depois `POST /api/v1/crm/flows/:flowId/versions/:id/activate` |
| Rodar para um lead | `POST /api/v1/crm/flows/triggers/leads/execute-lead` com `{ flowId, leadId }` (a automação precisa estar ativa) |
| Ver execuções | `GET /api/v1/crm/flows/:flowId/versions/:id/logs` |

Ativar, editar automação ativa e rodar disparam ações reais em produção (mensagens, mudanças em leads). Peça confirmação antes.

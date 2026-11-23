---
name: atendimento
description: Enviar mensagens e mídia, achar ou abrir conversas, transferir e finalizar atendimentos no Datacrazy. Use quando o pedido envolver conversa, WhatsApp, mensagem para um contato, imagem, vídeo, áudio ou documento.
---

# Atendimento

Mensagens saem de verdade para clientes reais. Envie exatamente o texto que o usuário pediu; se ele não ditou o texto, proponha e espere o ok.

## Enviar mensagem a um contato

1. Ache a conversa: `GET /api/v1/conversations` com `search` (nome ou telefone). Com mais de um resultado possível, mostre as opções e pergunte.
2. Sem conversa aberta e com o telefone em mãos, use `dc_search` por "conversation find or create by phone" (só WhatsApp).
3. Envie: `POST /api/v1/conversations/:id/messages` com `{ "body": "texto" }`.
4. Confirme ao usuário para quem foi e o que foi enviado.

Um contato, uma mensagem ditada pelo usuário: envie direto. Vários contatos de uma vez: diga quantos e peça confirmação antes.

## Enviar imagem, vídeo, áudio ou documento

1. `dc_upload` com o caminho do arquivo local (`kind`: `image`, `video` ou `file`). A resposta traz `url`, `fileName`, `mimeType`, `size` e `type`.
2. `POST /api/v1/conversations/:id/messages` com:

```json
{ "body": "legenda opcional",
  "attachments": [{ "fileName": "foto.png", "mimeType": "image/png", "type": "IMAGE", "size": 12345, "url": "<url do upload>" }] }
```

`type` é `IMAGE`, `VIDEO`, `AUDIO` ou `FILE`. O upload usa rota interna; avise o usuário uma vez.

## Outras ações

- Agendar: campo `scheduledDate` (ISO 8601) no envio.
- Anotação interna (não vai ao cliente): `isInternal: true`.
- Finalizar: `POST /api/v1/conversations/:id/finish`.
- Transferir, etiquetar conversa, iniciar automação na conversa: ache com `dc_search`.
- Reagir e apagar mensagem dependem do canal e podem ser recusados.

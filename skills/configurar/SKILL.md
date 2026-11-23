---
name: configurar
description: Configurar ou trocar a chave de API do Datacrazy neste plugin. Use quando o usuário quiser conectar a conta, quando uma tool do Datacrazy disser que a chave falta ou foi recusada (401), ou quando o usuário colar uma chave no chat.
---

# Conectar a conta Datacrazy

O plugin opera somente a conta de **produção** do Datacrazy. Não existe opção de QA, homologação, preview ou teste: recuse chave ou endereço desses ambientes.

## Regras da chave

- Nunca peça a chave no chat. Nunca repita, resuma ou confirme trechos de uma chave.
- Se o usuário colar uma chave no chat: não use, não repita, diga que você não usa chave enviada pelo chat e que ela ficou exposta na conversa, recomende revogá-la na tela de Chaves de API e criar outra, e siga os passos abaixo.
- Não grave a chave em arquivo, variável de ambiente, `.env` nem comando de terminal.

## Passo a passo para o usuário

1. Entrar em https://crm.datacrazy.io/config/api (menu Configurações > Chaves de API) com um usuário administrador e criar uma chave. Ela aparece uma única vez.
2. Guardar a chave na configuração do plugin, que usa o armazenamento seguro da ferramenta. A tool que acusou a falta da chave devolve o caminho exato para a ferramenta em uso.
   - Sem esse caminho em mãos: o campo de segredo do plugin ou a variável `DATACRAZY_API_KEY` do servidor `datacrazy`.
3. Repetir o pedido. Se as tools não aparecerem, reiniciar a ferramenta.

Depois de configurada, confirme a conexão com uma leitura simples (por exemplo, listar os funis) e diga ao usuário que está conectado.

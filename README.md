<img src="assets/icon.png" width="72" alt="Datacrazy">

# Datacrazy para agentes de IA

Plugin que liga o seu agente de IA à sua conta do [Datacrazy](https://datacrazy.io). Você pede em português e o agente executa: cadastra leads, move negócios, envia mensagens, monta automações e tira relatórios.

> Fase de testes. O plugin age na sua conta **real de produção**: mensagens chegam aos seus clientes e alterações valem na hora.

## Instalação por ferramenta

| Ferramenta | Guia |
|---|---|
| Claude Code (terminal, app e VS Code) | [docs/claude-code.md](docs/claude-code.md) |

```
/plugin install datacrazy --marketplace crm-datacrazy-io/datacrazy-agent-plugin
```

Outras ferramentas com suporte a MCP entram aqui conforme forem adaptadas.

## Conectar a conta

1. Entre com um usuário administrador em <https://crm.datacrazy.io/config/api> (Configurações > Chaves de API) e crie uma chave.
2. Guarde a chave na configuração do plugin, pelo caminho indicado no guia da sua ferramenta.
3. Faça um pedido.

A chave fica no armazenamento seguro da ferramenta. Nunca cole a chave na conversa: o agente não pede e não aceita chave pelo chat. O plugin fala somente com a API de produção (`https://api.g1.datacrazy.io`).

## Exemplos de pedido

- Lista meus funis e quantos negócios abertos tem em cada um.
- Cadastra um lead chamado Paulo Mendes, telefone 11 98888-1234.
- Manda pro João Silva no WhatsApp: "Oi João, seu pedido saiu para entrega hoje."
- Quantos negócios eu ganhei este mês?
- Cria uma automação: quando um lead receber a etiqueta vip, envia a mensagem "Bem-vindo ao clube VIP!".

## O que o plugin alcança

O catálogo embutido (`catalog/operations.json`) cobre a API pública e também rotas internas que a documentação pública não descreve. Cada operação tem um rótulo:

| Rótulo | Significado |
|---|---|
| `documentada` | Faz parte da [API pública oficial](https://docs.datacrazy.io). |
| `interna-provada` | Rota interna, fora da documentação pública, testada. Pode mudar sem aviso. |
| `interna-nao-provada` | Rota interna ainda não testada. Pode falhar. |
| `erro-conhecido` | Falha hoje no servidor. O plugin não chama. |
| `bloqueada-para-chave-de-api` | Exige sessão de usuário. O plugin não chama. |

O agente avisa quando usa uma rota fora da API pública.

## Segurança

- Excluir, agir em massa e ativar automação pedem a sua confirmação antes.
- Credenciais de canal (token do provedor, webhook) são ocultadas das respostas antes de chegarem ao agente.
- Rota fora do catálogo é recusada. Cobrança, plano, usuários e exclusão da conta ficam de fora.
- A API aceita 60 chamadas por minuto por rota, variando com o plano da conta.
- Para parar de usar, revogue a chave em Chaves de API e desinstale o plugin.

## Atualizações

O plugin confere a versão publicada uma vez por sessão (uma leitura pública no GitHub, sem enviar dados) e o agente avisa quando houver versão nova, com o passo de atualização da sua ferramenta.

## Componentes

O núcleo não depende de nenhuma ferramenta:

- `server/index.mjs`: servidor MCP local por stdio, sem dependências (Node.js 18 ou mais novo). Recebe a chave pela variável `DATACRAZY_API_KEY`. Tools: `dc_search`, `dc_call`, `dc_upload`, `dc_flow_blocks`.
- `catalog/`: operações, armadilhas conhecidas por operação (`notes.json`) e blocos de automação.
- `skills/`: guias de configuração, atendimento, automações, relatórios e leitura em volume.

Cada ferramenta tem só o seu adaptador:

- Claude Code: `.claude-plugin/` e `.mcp.json`.

## Licença

[Apache-2.0](LICENSE). A licença não concede uso do nome nem da marca Datacrazy.

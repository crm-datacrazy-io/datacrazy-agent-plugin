# Datacrazy no Claude Code

Vale para o terminal, o app do Claude (aba Code, sessão local ou SSH) e a extensão do VS Code. Não funciona no claude.ai pelo navegador nem em sessões na nuvem.

Requisitos: Claude Code atualizado e Node.js 18 ou mais novo.

## Instalar

No terminal:

```bash
claude plugin install datacrazy --marketplace crm-datacrazy-io/datacrazy-agent-plugin
```

Dentro de uma conversa do Claude Code:

```
/plugin install datacrazy --marketplace crm-datacrazy-io/datacrazy-agent-plugin
```

No app do Claude: **Plugins** > **Add** > **Add marketplace** > **Add from a repository**, informe `crm-datacrazy-io/datacrazy-agent-plugin`, clique em **Sync** e adicione o plugin **Datacrazy**.

## Guardar a chave

Crie a chave em <https://crm.datacrazy.io/config/api> e depois:

- Terminal ou VS Code: `/plugin` > aba **Installed** > **datacrazy** > **Configure options**. Atalho: `/plugin configure datacrazy@datacrazy`.
- App do Claude: **Plugins** > **Datacrazy** > aba **Settings**, cole a chave e clique em **Save**.

O plugin recarrega sozinho ao salvar. Se as tools não aparecerem, reinicie o Claude Code.

## Manter atualizado

A atualização automática vem desligada para plugins instalados por repositório. Ligue uma vez: `/plugin` > aba **Marketplaces** > **datacrazy** > **Turn on auto-update**.

Para atualizar à mão:

```bash
claude plugin marketplace update datacrazy
claude plugin update datacrazy@datacrazy
```

No app do Claude: **Plugins** > **Add** > **Manage marketplaces** > **⋯** > **Check for updates**, e depois **Update** na página do plugin. Reinicie o Claude Code em seguida.

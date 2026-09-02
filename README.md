# SiteBlock

Aplicação desktop para Ubuntu que bloqueia domínios pelo sistema e aplica horários semanais mesmo com a janela fechada. Chrome e Brave recebem também uma política `URLBlocklist`, atualizada a cada alteração; isso evita depender do cache DNS do navegador.

## Executar em desenvolvimento

1. Instale as dependências do sistema requeridas pelo Tauri (WebKitGTK, rsvg e ferramentas de compilação).
2. Instale o serviço privilegiado uma única vez:

   ```bash
   cd /caminho/para/siteblock
   sudo ./scripts/install-linux.sh
   ```

3. Rode o aplicativo:

   ```bash
   pnpm tauri dev
   ```

## Criar pacote Linux

```bash
pnpm tauri build
```

O serviço do sistema é separado do aplicativo: a interface roda como seu usuário e mantém uma única sessão Polkit enquanto está aberta. O agendador executa a cada minuto e decide se o bloqueio deve estar ativo de acordo com os períodos configurados.

## Navegadores

- **Chrome e Brave:** o helper cria uma política gerenciada em `/etc/opt/chrome/policies/managed/` e `/etc/brave/policies/managed/`. A política acompanha cada alteração de lista sem reiniciar o navegador.
- **Firefox:** o helper usa `WebsiteFilter` como camada do sistema, sem sobrescrever um arquivo de política já administrado por outra ferramenta.
- **Extensão SiteBlock:** a instalação registra automaticamente uma extensão CRX local para Chrome e Brave. No primeiro uso, reinicie cada navegador uma única vez para que ele carregue a extensão. Depois disso, ela lê apenas o estado efetivo em `/var/lib/siteblock/effective-state.json`, atualiza regras DNR e troca abas já abertas por uma página de bloqueio.

Para uma distribuição pública, a extensão também deve ser publicada e assinada na Chrome Web Store e no AMO. A versão local já contém o CRX para Chrome e Brave; Firefox continua com a política `WebsiteFilter` até a publicação do XPI assinado.

## Comportamento do agendamento

- Sem períodos configurados, ativar a chave mestra bloqueia imediatamente.
- Com períodos configurados, a chave mestra habilita a automação e os domínios são bloqueados somente dentro dos períodos.
- Períodos que terminam antes de começar, como `22:00 → 06:00`, atravessam a meia-noite.

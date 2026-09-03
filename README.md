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

O SiteBlock utiliza as políticas corporativas gerenciadas dos navegadores em conjunto com o `/etc/hosts`:

- **Chrome e Brave:** quando selecionados nas Configurações, o helper cria uma política gerenciada em `/etc/opt/chrome/policies/managed/` e `/etc/brave/policies/managed/` com a regra `URLBlocklist`. O bloqueio é instantâneo e não depende de reiniciar o navegador nem de cache DNS.
- **Firefox:** quando selecionado nas Configurações, o helper usa `WebsiteFilter` gerenciado em `/etc/firefox/policies/policies.json`, preservando a integridade caso outra ferramenta já utilize o arquivo.
- **Outros aplicativos / Sistema operacional:** o arquivo `/etc/hosts` redireciona todos os domínios configurados para `0.0.0.0` e `::1`, cobrindo qualquer outro cliente ou navegador no Linux.

## Comportamento do agendamento

- Sem períodos configurados, ativar a chave mestra bloqueia imediatamente.
- Com períodos configurados, a chave mestra habilita a automação e os domínios são bloqueados somente dentro dos períodos.
- Períodos que terminam antes de começar, como `22:00 → 06:00`, atravessam a meia-noite.

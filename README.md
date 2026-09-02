# SiteBlock

Aplicação desktop para Ubuntu que bloqueia domínios pelo `/etc/hosts` e aplica horários semanais mesmo com a janela fechada.

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

O serviço do sistema é separado do aplicativo: a interface roda como seu usuário e pede autorização via Polkit somente ao salvar alterações. O agendador executa a cada minuto e decide se o bloqueio deve estar ativo de acordo com os períodos configurados.

## Comportamento do agendamento

- Sem períodos configurados, ativar a chave mestra bloqueia imediatamente.
- Com períodos configurados, a chave mestra habilita a automação e os domínios são bloqueados somente dentro dos períodos.
- Períodos que terminam antes de começar, como `22:00 → 06:00`, atravessam a meia-noite.

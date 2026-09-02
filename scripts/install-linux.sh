#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ADMIN_BIN=$(find "$REPO_ROOT/src-tauri/target" -name "siteblock-admin" -type f 2>/dev/null | head -n 1)

if [ -z "$ADMIN_BIN" ]; then
  echo "Binário siteblock-admin não encontrado em target. Execute 'cargo build --bin siteblock-admin' em src-tauri primeiro." >&2
  exit 1
fi

install -d -m 0755 /usr/local/lib/siteblock /etc/siteblock /var/lib/siteblock
install -o root -g root -m 0755 "$ADMIN_BIN" /usr/local/lib/siteblock/siteblock-admin

install -o root -g root -m 0644 "$SCRIPT_DIR/siteblock-reconcile.service" /etc/systemd/system/siteblock-reconcile.service
install -o root -g root -m 0644 "$SCRIPT_DIR/siteblock-reconcile.timer" /etc/systemd/system/siteblock-reconcile.timer
install -o root -g root -m 0644 "$SCRIPT_DIR/com.luis.siteblock.policy" /usr/share/polkit-1/actions/com.luis.siteblock.policy

systemctl daemon-reload
systemctl enable --now siteblock-reconcile.timer
systemctl start siteblock-reconcile.service
echo "SiteBlock instalado com sucesso. Abra o aplicativo para configurar domínios e horários."

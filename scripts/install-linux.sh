#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
install -d -m 0755 /usr/local/lib/siteblock /etc/siteblock
install -o root -g root -m 0755 "$SCRIPT_DIR/siteblock-admin" /usr/local/lib/siteblock/siteblock-admin
install -o root -g root -m 0644 "$SCRIPT_DIR/siteblock-reconcile.service" /etc/systemd/system/siteblock-reconcile.service
install -o root -g root -m 0644 "$SCRIPT_DIR/siteblock-reconcile.timer" /etc/systemd/system/siteblock-reconcile.timer
install -o root -g root -m 0644 "$SCRIPT_DIR/com.luis.siteblock.policy" /usr/share/polkit-1/actions/com.luis.siteblock.policy
systemctl daemon-reload
systemctl enable --now siteblock-reconcile.timer
systemctl start siteblock-reconcile.service
echo "SiteBlock instalado. Abra o aplicativo para adicionar domínios e horários."

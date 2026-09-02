#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
install -d -m 0755 /usr/local/lib/siteblock /usr/local/share/siteblock/extensions/siteblock /etc/siteblock /var/lib/siteblock
install -d -m 1777 /run/siteblock
install -o root -g root -m 0755 "$SCRIPT_DIR/siteblock-admin" /usr/local/lib/siteblock/siteblock-admin
install -o root -g root -m 0755 "$SCRIPT_DIR/siteblock-browser-bridge" /usr/local/lib/siteblock/siteblock-browser-bridge
install -o root -g root -m 0755 "$SCRIPT_DIR/siteblock-browser-bridge-chromium" /usr/local/lib/siteblock/siteblock-browser-bridge-chromium
install -o root -g root -m 0755 "$SCRIPT_DIR/siteblock-browser-bridge-firefox" /usr/local/lib/siteblock/siteblock-browser-bridge-firefox
install -o root -g root -m 0644 "$SCRIPT_DIR/siteblock-reconcile.service" /etc/systemd/system/siteblock-reconcile.service
install -o root -g root -m 0644 "$SCRIPT_DIR/siteblock-reconcile.timer" /etc/systemd/system/siteblock-reconcile.timer
install -o root -g root -m 0644 "$SCRIPT_DIR/com.luis.siteblock.policy" /usr/share/polkit-1/actions/com.luis.siteblock.policy
install -o root -g root -m 0644 "$SCRIPT_DIR/../extensions/siteblock/manifest.json" /usr/local/share/siteblock/extensions/siteblock/manifest.json
install -o root -g root -m 0644 "$SCRIPT_DIR/../extensions/siteblock/background.js" /usr/local/share/siteblock/extensions/siteblock/background.js
install -o root -g root -m 0644 "$SCRIPT_DIR/../extensions/siteblock/blocked.html" /usr/local/share/siteblock/extensions/siteblock/blocked.html
install -o root -g root -m 0644 "$SCRIPT_DIR/../extensions/siteblock/siteblock.crx" /usr/local/share/siteblock/extensions/siteblock.crx
install -d -m 0755 /etc/opt/chrome/native-messaging-hosts /etc/brave/native-messaging-hosts /usr/lib/mozilla/native-messaging-hosts
install -o root -g root -m 0644 "$SCRIPT_DIR/native-host-chromium.json" /etc/opt/chrome/native-messaging-hosts/com.luis.siteblock.json
install -o root -g root -m 0644 "$SCRIPT_DIR/native-host-chromium.json" /etc/brave/native-messaging-hosts/com.luis.siteblock.json
install -o root -g root -m 0644 "$SCRIPT_DIR/native-host-firefox.json" /usr/lib/mozilla/native-messaging-hosts/com.luis.siteblock.json
for extension_dir in /opt/google/chrome/extensions /opt/brave.com/brave/extensions /usr/share/brave/extensions; do
  install -d -m 0755 "$extension_dir"
  install -o root -g root -m 0644 "$SCRIPT_DIR/chromium-external-extension.json" "$extension_dir/ejhdjlpfeejbkjmmdnhcgnpjlcllldko.json"
done
systemctl daemon-reload
systemctl enable --now siteblock-reconcile.timer
systemctl start siteblock-reconcile.service
echo "SiteBlock instalado. Abra o aplicativo para adicionar domínios e horários."

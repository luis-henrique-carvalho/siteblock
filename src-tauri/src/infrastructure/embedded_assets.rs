use std::{fs, os::unix::fs::PermissionsExt, path::{Path, PathBuf}};

pub const HELPER_PATH: &str = "/usr/local/lib/siteblock/siteblock-admin";

pub const SERVICE_SOURCE: &str = include_str!("../../../scripts/siteblock-reconcile.service");
pub const TIMER_SOURCE: &str = include_str!("../../../scripts/siteblock-reconcile.timer");
pub const POLICY_SOURCE: &str = include_str!("../../../scripts/com.luis.siteblock.policy");
pub const BROWSER_BRIDGE_CHROMIUM_SOURCE: &str =
    include_str!("../../../scripts/siteblock-browser-bridge-chromium");
pub const BROWSER_BRIDGE_FIREFOX_SOURCE: &str =
    include_str!("../../../scripts/siteblock-browser-bridge-firefox");
pub const NATIVE_HOST_CHROMIUM_SOURCE: &str =
    include_str!("../../../scripts/native-host-chromium.json");
pub const NATIVE_HOST_FIREFOX_SOURCE: &str =
    include_str!("../../../scripts/native-host-firefox.json");
pub const CHROMIUM_EXTERNAL_EXTENSION_SOURCE: &str =
    include_str!("../../../scripts/chromium-external-extension.json");
pub const EXTENSION_MANIFEST_SOURCE: &str =
    include_str!("../../../extensions/siteblock/manifest.json");
pub const EXTENSION_BACKGROUND_SOURCE: &str =
    include_str!("../../../extensions/siteblock/background.js");
pub const EXTENSION_BLOCKED_SOURCE: &str =
    include_str!("../../../extensions/siteblock/blocked.html");
pub const EXTENSION_CRX_SOURCE: &[u8] =
    include_bytes!("../../../extensions/siteblock/siteblock.crx");

pub const INSTALLER_SCRIPT: &str = r#"#!/bin/sh
set -eu
source_dir=$1
install -d -m 0755 /usr/local/lib/siteblock /usr/local/share/siteblock/extensions/siteblock /etc/siteblock /var/lib/siteblock
install -d -m 1777 /run/siteblock
install -o root -g root -m 0755 "$source_dir/siteblock-admin" /usr/local/lib/siteblock/siteblock-admin
install -o root -g root -m 0755 "$source_dir/siteblock-browser-bridge" /usr/local/lib/siteblock/siteblock-browser-bridge
install -o root -g root -m 0755 "$source_dir/siteblock-browser-bridge-chromium" /usr/local/lib/siteblock/siteblock-browser-bridge-chromium
install -o root -g root -m 0755 "$source_dir/siteblock-browser-bridge-firefox" /usr/local/lib/siteblock/siteblock-browser-bridge-firefox
install -o root -g root -m 0644 "$source_dir/siteblock-reconcile.service" /etc/systemd/system/siteblock-reconcile.service
install -o root -g root -m 0644 "$source_dir/siteblock-reconcile.timer" /etc/systemd/system/siteblock-reconcile.timer
install -o root -g root -m 0644 "$source_dir/com.luis.siteblock.policy" /usr/share/polkit-1/actions/com.luis.siteblock.policy
install -o root -g root -m 0644 "$source_dir/manifest.json" /usr/local/share/siteblock/extensions/siteblock/manifest.json
install -o root -g root -m 0644 "$source_dir/background.js" /usr/local/share/siteblock/extensions/siteblock/background.js
install -o root -g root -m 0644 "$source_dir/blocked.html" /usr/local/share/siteblock/extensions/siteblock/blocked.html
install -o root -g root -m 0644 "$source_dir/siteblock.crx" /usr/local/share/siteblock/extensions/siteblock.crx
install -d -m 0755 /etc/opt/chrome/native-messaging-hosts /etc/brave/native-messaging-hosts /usr/lib/mozilla/native-messaging-hosts
install -o root -g root -m 0644 "$source_dir/native-host-chromium.json" /etc/opt/chrome/native-messaging-hosts/com.luis.siteblock.json
install -o root -g root -m 0644 "$source_dir/native-host-chromium.json" /etc/brave/native-messaging-hosts/com.luis.siteblock.json
install -o root -g root -m 0644 "$source_dir/native-host-firefox.json" /usr/lib/mozilla/native-messaging-hosts/com.luis.siteblock.json
for extension_dir in /opt/google/chrome/extensions /opt/brave.com/brave/extensions /usr/share/brave/extensions; do
  install -d -m 0755 "$extension_dir"
  install -o root -g root -m 0644 "$source_dir/chromium-external-extension.json" "$extension_dir/ejhdjlpfeejbkjmmdnhcgnpjlcllldko.json"
done
systemctl daemon-reload
systemctl enable --now siteblock-reconcile.timer
systemctl start siteblock-reconcile.service
exec /usr/local/lib/siteblock/siteblock-admin session
"#;

fn find_binary(bin_name: &str) -> std::io::Result<PathBuf> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join(bin_name);
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }

    let search_paths = [
        format!("target/debug/{}", bin_name),
        format!("target/release/{}", bin_name),
        format!("src-tauri/target/debug/{}", bin_name),
        format!("src-tauri/target/release/{}", bin_name),
        format!("/usr/local/lib/siteblock/{}", bin_name),
    ];

    for path in &search_paths {
        let p = PathBuf::from(path);
        if p.is_file() {
            return Ok(p);
        }
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::NotFound,
        format!("Binário '{}' não encontrado para instalação.", bin_name),
    ))
}

pub fn extract_all_to(target_dir: &Path) -> std::io::Result<()> {
    let admin_bin = find_binary("siteblock-admin")?;
    let bridge_bin = find_binary("siteblock-browser-bridge")?;

    fs::copy(&admin_bin, target_dir.join("siteblock-admin"))?;
    fs::set_permissions(target_dir.join("siteblock-admin"), fs::Permissions::from_mode(0o755))?;

    fs::copy(&bridge_bin, target_dir.join("siteblock-browser-bridge"))?;
    fs::set_permissions(target_dir.join("siteblock-browser-bridge"), fs::Permissions::from_mode(0o755))?;

    write_text_asset(&target_dir.join("siteblock-reconcile.service"), SERVICE_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("siteblock-reconcile.timer"), TIMER_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("com.luis.siteblock.policy"), POLICY_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("siteblock-browser-bridge-chromium"), BROWSER_BRIDGE_CHROMIUM_SOURCE, 0o755)?;
    write_text_asset(&target_dir.join("siteblock-browser-bridge-firefox"), BROWSER_BRIDGE_FIREFOX_SOURCE, 0o755)?;
    write_text_asset(&target_dir.join("native-host-chromium.json"), NATIVE_HOST_CHROMIUM_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("native-host-firefox.json"), NATIVE_HOST_FIREFOX_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("chromium-external-extension.json"), CHROMIUM_EXTERNAL_EXTENSION_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("manifest.json"), EXTENSION_MANIFEST_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("background.js"), EXTENSION_BACKGROUND_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("blocked.html"), EXTENSION_BLOCKED_SOURCE, 0o644)?;
    write_binary_asset(&target_dir.join("siteblock.crx"), EXTENSION_CRX_SOURCE, 0o644)?;
    write_text_asset(&target_dir.join("install"), INSTALLER_SCRIPT, 0o755)?;
    Ok(())
}

fn write_text_asset(path: &Path, content: &str, mode: u32) -> std::io::Result<()> {
    fs::write(path, content)?;
    fs::set_permissions(path, fs::Permissions::from_mode(mode))
}

fn write_binary_asset(path: &Path, content: &[u8], mode: u32) -> std::io::Result<()> {
    fs::write(path, content)?;
    fs::set_permissions(path, fs::Permissions::from_mode(mode))
}


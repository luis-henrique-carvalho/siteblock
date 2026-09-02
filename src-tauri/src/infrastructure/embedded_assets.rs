use std::{
    fs,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
};

pub const HELPER_PATH: &str = "/usr/local/lib/siteblock/siteblock-admin";

pub const SERVICE_SOURCE: &str = include_str!("../../../scripts/siteblock-reconcile.service");
pub const TIMER_SOURCE: &str = include_str!("../../../scripts/siteblock-reconcile.timer");
pub const POLICY_SOURCE: &str = include_str!("../../../scripts/com.luis.siteblock.policy");

pub const INSTALLER_SCRIPT: &str = r#"#!/bin/sh
set -eu
source_dir=$1
install -d -m 0755 /usr/local/lib/siteblock /etc/siteblock /var/lib/siteblock
install -o root -g root -m 0755 "$source_dir/siteblock-admin" /usr/local/lib/siteblock/siteblock-admin
install -o root -g root -m 0644 "$source_dir/siteblock-reconcile.service" /etc/systemd/system/siteblock-reconcile.service
install -o root -g root -m 0644 "$source_dir/siteblock-reconcile.timer" /etc/systemd/system/siteblock-reconcile.timer
install -o root -g root -m 0644 "$source_dir/com.luis.siteblock.policy" /usr/share/polkit-1/actions/com.luis.siteblock.policy
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

    fs::copy(&admin_bin, target_dir.join("siteblock-admin"))?;
    fs::set_permissions(
        target_dir.join("siteblock-admin"),
        fs::Permissions::from_mode(0o755),
    )?;

    write_text_asset(
        &target_dir.join("siteblock-reconcile.service"),
        SERVICE_SOURCE,
        0o644,
    )?;
    write_text_asset(
        &target_dir.join("siteblock-reconcile.timer"),
        TIMER_SOURCE,
        0o644,
    )?;
    write_text_asset(
        &target_dir.join("com.luis.siteblock.policy"),
        POLICY_SOURCE,
        0o644,
    )?;
    write_text_asset(&target_dir.join("install"), INSTALLER_SCRIPT, 0o755)?;
    Ok(())
}

fn write_text_asset(path: &Path, content: &str, mode: u32) -> std::io::Result<()> {
    fs::write(path, content)?;
    fs::set_permissions(path, fs::Permissions::from_mode(mode))
}

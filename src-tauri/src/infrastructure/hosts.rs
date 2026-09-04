use std::{fs, io::Write, os::unix::fs::PermissionsExt, path::Path};

use crate::domain::entities::SiteBlockConfig;

pub const HOSTS_PATH: &str = "/etc/hosts";
pub const BEGIN_MARKER: &str = "# BEGIN SITEBLOCK MANAGED";
pub const END_MARKER: &str = "# END SITEBLOCK MANAGED";

pub fn atomic_write(path: &Path, content: &[u8], mode: u32) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp_path = path.with_extension(format!("tmp.{}", std::process::id()));
    {
        let mut file = fs::File::create(&tmp_path)?;
        file.write_all(content)?;
        file.sync_all()?;
    }
    fs::set_permissions(&tmp_path, fs::Permissions::from_mode(mode))?;
    fs::rename(&tmp_path, path)
}

pub fn is_hosts_blocking_active() -> bool {
    match fs::read_to_string(HOSTS_PATH) {
        Ok(content) => content.contains(BEGIN_MARKER),
        Err(_) => false,
    }
}

pub fn render_hosts_content(original: &str, config: &SiteBlockConfig, enabled: bool) -> String {
    let mut kept = Vec::new();
    let mut in_block = false;

    for line in original.lines() {
        if line == BEGIN_MARKER {
            in_block = true;
            continue;
        }
        if line == END_MARKER {
            in_block = false;
            continue;
        }
        if !in_block {
            kept.push(line.to_string());
        }
    }

    if enabled {
        kept.push(String::new());
        kept.push(BEGIN_MARKER.to_string());
        for host in config.blocked_hosts() {
            kept.push(format!("0.0.0.0 {}", host));
            kept.push(format!("::1 {}", host));
        }
        kept.push(END_MARKER.to_string());
    }

    let trimmed = kept.join("\n").trim_end().to_string();
    if trimmed.is_empty() {
        String::new()
    } else {
        trimmed + "\n"
    }
}

pub fn clean_hosts_file_if_present() -> std::io::Result<()> {
    if !is_hosts_blocking_active() {
        return Ok(());
    }
    let original = fs::read_to_string(HOSTS_PATH)?;
    let empty_config = SiteBlockConfig::new(false, Vec::new());
    let output = render_hosts_content(&original, &empty_config, false);
    let mode = fs::metadata(HOSTS_PATH).map_or(0o644, |m| m.permissions().mode());
    atomic_write(Path::new(HOSTS_PATH), output.as_bytes(), mode)?;
    crate::infrastructure::system_core::flush_dns();
    Ok(())
}

pub fn write_hosts_file(config: &SiteBlockConfig, enabled: bool) -> std::io::Result<()> {
    if !enabled {
        let original = fs::read_to_string(HOSTS_PATH).unwrap_or_default();
        let output = render_hosts_content(&original, config, false);
        let mode = fs::metadata(HOSTS_PATH).map_or(0o644, |m| m.permissions().mode());
        atomic_write(Path::new(HOSTS_PATH), output.as_bytes(), mode)
    } else {
        clean_hosts_file_if_present()
    }
}

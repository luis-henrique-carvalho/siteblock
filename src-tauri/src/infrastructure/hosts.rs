use std::{fs, io::Write, path::Path};

use crate::domain::entities::SiteBlockConfig;
use crate::infrastructure::paths;
use crate::infrastructure::platform::imp::{get_file_mode, replace_file_atomically};

pub const HOSTS_PATH: &str = paths::UNIX_HOSTS_PATH;
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

    replace_file_atomically(path, &tmp_path, mode)
}

pub fn is_hosts_blocking_active() -> bool {
    let path = paths::hosts_path();
    match fs::read_to_string(&path) {
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
    let path = paths::hosts_path();
    let original = fs::read_to_string(&path)?;
    let empty_config = SiteBlockConfig::new(false, Vec::new());
    let output = render_hosts_content(&original, &empty_config, false);
    let mode = get_file_mode(&path);
    atomic_write(&path, output.as_bytes(), mode)?;
    crate::infrastructure::system_core::flush_dns();
    Ok(())
}

pub fn write_hosts_file(config: &SiteBlockConfig, enabled: bool) -> std::io::Result<()> {
    let path = paths::hosts_path();
    if !enabled {
        let original = fs::read_to_string(&path).unwrap_or_default();
        let output = render_hosts_content(&original, config, false);
        let mode = get_file_mode(&path);
        atomic_write(&path, output.as_bytes(), mode)
    } else {
        clean_hosts_file_if_present()
    }
}

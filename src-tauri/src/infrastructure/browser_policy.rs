use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

use sha2::{Digest, Sha256};

use crate::domain::entities::BrowserIntegration;
use crate::infrastructure::hosts::atomic_write;

pub const FIREFOX_OWNERSHIP_PATH: &str = "/etc/siteblock/firefox-policy.sha256";
pub const FIREFOX_POLICY_PATH: &str = "/etc/firefox/policies/policies.json";

pub fn build_chromium_policy_content(filters: &[String]) -> String {
    let body = serde_json::json!({ "URLBlocklist": filters });
    serde_json::to_string_pretty(&body).unwrap_or_default() + "\n"
}

pub fn write_chromium_policies(
    filters: &[String],
    enabled_browsers: &[String],
) -> HashMap<String, bool> {
    let policies = [
        (
            "Chrome",
            Path::new("/etc/opt/chrome/policies/managed/com.luis.siteblock.json"),
        ),
        (
            "Brave",
            Path::new("/etc/brave/policies/managed/com.luis.siteblock.json"),
        ),
    ];

    let mut results = HashMap::new();
    let content = build_chromium_policy_content(filters);

    for (name, path) in policies {
        let enabled = enabled_browsers.iter().any(|browser| browser == name);
        let success = if enabled {
            atomic_write(path, content.as_bytes(), 0o644).is_ok()
        } else {
            let _ = fs::remove_file(path);
            false
        };
        results.insert(name.to_string(), success);
    }
    results
}

pub fn bytes_sha256(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

fn file_sha256(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    Some(bytes_sha256(&bytes))
}

pub fn build_firefox_policy_content(filters: &[String]) -> String {
    let body = serde_json::json!({
        "policies": {
            "WebsiteFilter": {
                "Block": filters
            }
        }
    });
    serde_json::to_string_pretty(&body).unwrap_or_default() + "\n"
}

pub fn can_overwrite_firefox_policy(
    policy_exists: bool,
    previous_digest: Option<&str>,
    current_digest: Option<&str>,
) -> bool {
    if policy_exists && previous_digest.is_some() && previous_digest != current_digest {
        return false;
    }
    true
}

pub fn write_firefox_policy(filters: &[String]) -> bool {
    let policy_path = Path::new(FIREFOX_POLICY_PATH);
    let ownership_path = Path::new(FIREFOX_OWNERSHIP_PATH);

    let previous_digest = fs::read_to_string(ownership_path)
        .map(|s| s.trim().to_string())
        .ok();

    let current_digest = file_sha256(policy_path);

    if !can_overwrite_firefox_policy(
        policy_path.exists(),
        previous_digest.as_deref(),
        current_digest.as_deref(),
    ) {
        log::warn!("Política do Firefox existente não pertence ao SiteBlock. Ignorando escrita.");
        return false;
    }

    let content = build_firefox_policy_content(filters);

    if atomic_write(policy_path, content.as_bytes(), 0o644).is_ok() {
        if let Some(digest) = file_sha256(policy_path) {
            let _ = atomic_write(ownership_path, digest.as_bytes(), 0o644);
        }
        true
    } else {
        false
    }
}

pub fn remove_firefox_policy() -> bool {
    let policy_path = Path::new(FIREFOX_POLICY_PATH);
    let ownership_path = Path::new(FIREFOX_OWNERSHIP_PATH);

    if !policy_path.exists() {
        let _ = fs::remove_file(ownership_path);
        return true;
    }

    let previous_digest = fs::read_to_string(ownership_path)
        .map(|digest| digest.trim().to_string())
        .ok();
    let current_digest = file_sha256(policy_path);

    if previous_digest.as_deref() != current_digest.as_deref() {
        log::warn!("Política do Firefox não pertence ao SiteBlock. Ignorando remoção.");
        return false;
    }

    fs::remove_file(policy_path).is_ok() && fs::remove_file(ownership_path).is_ok()
}

#[derive(Debug, Clone, Copy)]
pub struct BrowserDefinition {
    pub name: &'static str,
    pub binaries: &'static [&'static str],
    pub requires_restart: bool,
    pub supports_hot_reload: bool,
}

pub const SUPPORTED_BROWSER_DEFINITIONS: [BrowserDefinition; 3] = [
    BrowserDefinition {
        name: "Chrome",
        binaries: &["google-chrome", "google-chrome-stable"],
        requires_restart: false,
        supports_hot_reload: true,
    },
    BrowserDefinition {
        name: "Brave",
        binaries: &["brave-browser", "brave"],
        requires_restart: false,
        supports_hot_reload: true,
    },
    BrowserDefinition {
        name: "Firefox",
        binaries: &["firefox"],
        requires_restart: true,
        supports_hot_reload: false,
    },
];

fn find_command(names: &[&str]) -> Option<PathBuf> {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(':') {
            for name in names {
                let full = Path::new(dir).join(name);
                if full.is_file() {
                    return Some(full);
                }
            }
        }
    }
    None
}

fn command_exists(names: &[&str]) -> bool {
    find_command(names).is_some()
}

fn browser_mode(name: &str, enabled_browsers: &[String]) -> String {
    if enabled_browsers.iter().any(|browser| browser == name) {
        "Política gerenciada".to_string()
    } else {
        "Desativado nas configurações".to_string()
    }
}

pub fn get_browser_integrations(
    chromium: &HashMap<String, bool>,
    firefox_policy: bool,
    enabled_browsers: &[String],
) -> Vec<BrowserIntegration> {
    SUPPORTED_BROWSER_DEFINITIONS
        .iter()
        .map(|def| {
            let detected = command_exists(def.binaries);
            let is_enabled = enabled_browsers.iter().any(|browser| browser == def.name);
            let policy_ready = if is_enabled {
                if def.name == "Firefox" {
                    firefox_policy
                } else {
                    *chromium.get(def.name).unwrap_or(&false)
                }
            } else {
                false
            };

            BrowserIntegration {
                name: def.name.to_string(),
                detected,
                enabled: is_enabled,
                policy_ready,
                mode: browser_mode(def.name, enabled_browsers),
                requires_restart: def.requires_restart,
            }
        })
        .collect()
}

pub fn trigger_browser_policy_reload(enabled_browsers: &[String]) {
    let enabled = enabled_browsers.to_vec();
    std::thread::spawn(move || {
        for def in &SUPPORTED_BROWSER_DEFINITIONS {
            if def.supports_hot_reload && enabled.iter().any(|b| b == def.name) {
                if let Some(bin_path) = find_command(def.binaries) {
                    log::info!(
                        target: "siteblock::policy",
                        "[Policy] Disparando reload nativo de políticas para {}: {} --refresh-platform-policy",
                        def.name,
                        bin_path.display()
                    );
                    let _ = std::process::Command::new(&bin_path)
                        .arg("--refresh-platform-policy")
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .status();
                }
            }
        }
    });
}

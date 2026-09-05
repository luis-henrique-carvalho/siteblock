use std::{collections::HashMap, fs, path::Path};

use sha2::{Digest, Sha256};

use crate::domain::entities::{BrowserIntegration, SiteBlockConfig};
use crate::infrastructure::hosts::atomic_write;

pub use crate::infrastructure::platform::imp::{
    write_chromium_policies, BrowserEngine, BrowserSpec, BROWSER_SPECS,
};

pub const FIREFOX_OWNERSHIP_PATH: &str = "/etc/siteblock/firefox-policy.sha256";
pub const FIREFOX_POLICY_PATH: &str = "/etc/firefox/policies/policies.json";

pub type BrowserDefinition = BrowserSpec;
pub const SUPPORTED_BROWSER_DEFINITIONS: &[BrowserSpec] = BROWSER_SPECS;

pub fn apply_all_browser_policies(
    config: &SiteBlockConfig,
    enabled: bool,
) -> HashMap<String, bool> {
    let mut results = HashMap::new();
    for spec in BROWSER_SPECS {
        let success = spec.apply(config, enabled);
        results.insert(spec.name.to_string(), success);
    }
    results
}

pub fn check_all_browser_policies() -> HashMap<String, bool> {
    let mut results = HashMap::new();
    for spec in BROWSER_SPECS {
        results.insert(spec.name.to_string(), spec.is_policy_present());
    }
    results
}

#[must_use]
pub fn build_registry_blocklist_entries(filters: &[String]) -> Vec<(String, String)> {
    filters
        .iter()
        .enumerate()
        .map(|(i, filter)| ((i + 1).to_string(), filter.clone()))
        .collect()
}

pub fn build_chromium_policy_content(filters: &[String]) -> String {
    let body = serde_json::json!({ "URLBlocklist": filters });
    serde_json::to_string_pretty(&body).unwrap_or_default() + "\n"
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
    BROWSER_SPECS
        .iter()
        .map(|spec| {
            let detected = spec.is_detected();
            let is_enabled = enabled_browsers.iter().any(|browser| browser == spec.name);
            let policy_ready = if is_enabled {
                if spec.name == "Firefox" {
                    firefox_policy
                } else {
                    *chromium.get(spec.name).unwrap_or(&false)
                }
            } else {
                false
            };

            BrowserIntegration {
                name: spec.name.to_string(),
                detected,
                enabled: is_enabled,
                policy_ready,
                mode: browser_mode(spec.name, enabled_browsers),
                requires_restart: spec.requires_restart,
            }
        })
        .collect()
}

pub fn trigger_browser_policy_reload(enabled_browsers: &[String]) {
    let enabled = enabled_browsers.to_vec();
    std::thread::spawn(move || {
        for spec in BROWSER_SPECS {
            if enabled.iter().any(|b| b == spec.name) {
                spec.reload();
            }
        }
    });
}

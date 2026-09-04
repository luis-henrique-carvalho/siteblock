use std::{collections::HashMap, fs, path::Path};

use chrono::{DateTime, Local, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::entities::{Profile, Schedule, SiteBlockConfig, SiteBlockState};
use crate::infrastructure::focus_stats::{FocusSnapshot, FocusStatsStore};

// Re-export submodules
pub use crate::infrastructure::admin_protocol::{
    get_admin_capabilities, handle_admin_action_with, handle_admin_session_line_with, is_root,
    query_focus_statistics,
};
pub use crate::infrastructure::browser_policy::{
    build_chromium_policy_content, build_firefox_policy_content, bytes_sha256,
    can_overwrite_firefox_policy, get_browser_integrations, remove_firefox_policy,
    trigger_browser_policy_reload, write_chromium_policies, write_firefox_policy,
    BrowserDefinition, FIREFOX_OWNERSHIP_PATH, FIREFOX_POLICY_PATH, SUPPORTED_BROWSER_DEFINITIONS,
};
pub use crate::infrastructure::hosts::{
    atomic_write, clean_hosts_file_if_present, is_hosts_blocking_active, render_hosts_content,
    write_hosts_file, BEGIN_MARKER, END_MARKER, HOSTS_PATH,
};

// Re-export domain helpers for backward compatibility
pub use crate::domain::entities::{domain_hosts, parse_minute};

pub const BASE_DIR: &str = "/etc/siteblock";
pub const CONFIG_PATH: &str = "/etc/siteblock/config.json";
pub const RUNTIME_DIR: &str = "/var/lib/siteblock";
pub const EFFECTIVE_STATE_PATH: &str = "/var/lib/siteblock/effective-state.json";
pub const FOCUS_STATS_DIRECTORY: &str = "/var/lib/siteblock";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveState {
    pub active: bool,
    pub domains: Vec<String>,
    #[serde(default)]
    pub revision: u64,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: Option<String>,
}

// Facade functions delegating to domain entities
pub fn applies_now(schedule: &Schedule, now: DateTime<Local>) -> bool {
    schedule.applies_now(now)
}

pub fn is_profile_active(profile: &Profile, now: DateTime<Local>) -> bool {
    profile.is_active(now)
}

pub fn get_active_profiles(config: &SiteBlockConfig, now: DateTime<Local>) -> Vec<&Profile> {
    config.active_profiles(now)
}

pub fn effective_blocked_domains(config: &SiteBlockConfig, now: DateTime<Local>) -> Vec<String> {
    config.effective_blocked_domains(now)
}

pub fn should_block(config: &SiteBlockConfig, now: DateTime<Local>) -> bool {
    config.should_block(now)
}

pub fn blocked_hosts(config: &SiteBlockConfig) -> Vec<String> {
    config.blocked_hosts()
}

pub fn blocked_chromium_filters(config: &SiteBlockConfig, enabled: bool) -> Vec<String> {
    config.blocked_chromium_filters(enabled)
}

pub fn blocked_url_filters(config: &SiteBlockConfig, enabled: bool) -> Vec<String> {
    config.blocked_url_filters(enabled)
}

pub fn flush_dns() {
    let _ = std::process::Command::new("resolvectl")
        .arg("flush-caches")
        .status();
    let _ = std::process::Command::new("systemd-resolve")
        .arg("--flush-caches")
        .status();
    let _ = std::process::Command::new("nscd")
        .args(["-i", "hosts"])
        .status();
}

pub fn read_config() -> SiteBlockConfig {
    let path = Path::new(CONFIG_PATH);
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(mut cfg) = serde_json::from_str::<SiteBlockConfig>(&content) {
            cfg.ensure_migrated();
            return cfg;
        }
    }
    SiteBlockConfig::new(false, Profile::default_presets())
}

pub fn write_config_file(config: &SiteBlockConfig) -> std::io::Result<()> {
    let content = serde_json::to_string_pretty(config).unwrap_or_default() + "\n";
    atomic_write(Path::new(CONFIG_PATH), content.as_bytes(), 0o644)
}

pub fn write_effective_state(config: &SiteBlockConfig, enabled: bool) -> EffectiveState {
    let path = Path::new(EFFECTIVE_STATE_PATH);
    let previous: Option<EffectiveState> = fs::read_to_string(path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok());

    let desired_domains = if enabled {
        blocked_hosts(config)
    } else {
        Vec::new()
    };
    let mut revision = previous.as_ref().map_or(0, |p| p.revision);

    let changed = match &previous {
        Some(prev) => prev.active != enabled || prev.domains != desired_domains,
        None => true,
    };

    if changed {
        revision += 1;
    }

    let payload = EffectiveState {
        active: enabled,
        domains: desired_domains,
        revision,
        updated_at: Some(Utc::now().to_rfc3339()),
    };

    let content = serde_json::to_string_pretty(&payload).unwrap_or_default() + "\n";
    let _ = atomic_write(path, content.as_bytes(), 0o644);

    payload
}

pub fn get_current_state(
    config: &SiteBlockConfig,
    chromium_policies: Option<HashMap<String, bool>>,
    firefox_policy: Option<bool>,
) -> SiteBlockState {
    let chromium = chromium_policies.unwrap_or_else(|| {
        let mut map = HashMap::new();
        map.insert(
            "Chrome".to_string(),
            Path::new("/etc/opt/chrome/policies/managed/com.luis.siteblock.json").exists(),
        );
        map.insert(
            "Brave".to_string(),
            Path::new("/etc/brave/policies/managed/com.luis.siteblock.json").exists(),
        );
        map
    });

    let ff_policy = firefox_policy.unwrap_or_else(|| {
        Path::new(FIREFOX_POLICY_PATH).exists() && Path::new(FIREFOX_OWNERSHIP_PATH).exists()
    });

    let effective: Option<EffectiveState> = fs::read_to_string(EFFECTIVE_STATE_PATH)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok());

    let revision = effective.map_or(0, |e| e.revision);

    let now = Local::now();
    let active_profiles = get_active_profiles(config, now);
    let active_profile_ids: Vec<String> = active_profiles.iter().map(|p| p.id.clone()).collect();
    let effective_domains = effective_blocked_domains(config, now);

    let (legacy_domains, legacy_schedules) = if !config.profiles.is_empty() {
        (
            effective_domains.clone(),
            config
                .profiles
                .iter()
                .flat_map(|p| p.schedules.clone())
                .collect(),
        )
    } else {
        (config.domains.clone(), config.schedules.clone())
    };

    let active = (chromium.values().any(|&v| v) || ff_policy) && should_block(config, Local::now());

    SiteBlockState {
        active,
        enabled: config.enabled,
        profiles: config.profiles.clone(),
        active_profile_ids,
        effective_domains,
        domains: legacy_domains,
        schedules: legacy_schedules,
        helper_installed: Path::new("/usr/local/lib/siteblock/siteblock-admin").exists(),
        session_supported: true,
        revision,
        browser_integrations: get_browser_integrations(
            &chromium,
            ff_policy,
            &config.enabled_browsers,
        ),
        enabled_browsers: config.enabled_browsers.clone(),
        helper_outdated: false,
    }
}

pub fn apply_config(config: &SiteBlockConfig) -> SiteBlockState {
    let now = Local::now();
    let enabled = should_block(config, now);

    let _ = clean_hosts_file_if_present();
    let chromium_filters = blocked_chromium_filters(config, enabled);
    let firefox_filters = blocked_url_filters(config, enabled);
    let chromium = write_chromium_policies(&chromium_filters, &config.enabled_browsers);
    let ff_policy = if config
        .enabled_browsers
        .iter()
        .any(|browser| browser == "Firefox")
    {
        write_firefox_policy(&firefox_filters)
    } else {
        remove_firefox_policy()
    };
    let _ = write_effective_state(config, enabled);

    let policies_active = (chromium.values().any(|&v| v) || ff_policy) && enabled;
    let snapshot = if policies_active {
        FocusSnapshot::from_profiles(&get_active_profiles(config, now))
    } else {
        FocusSnapshot::inactive()
    };
    if let Err(error) = FocusStatsStore::at_directory(Path::new(FOCUS_STATS_DIRECTORY))
        .and_then(|stats| stats.record(snapshot, now))
    {
        log::warn!("Não foi possível registrar a estatística de foco: {error}");
    }

    get_current_state(config, Some(chromium), Some(ff_policy))
}

#[cfg(test)]
#[path = "system_core/tests.rs"]
mod tests;

use std::{collections::HashMap, fs, io::Write, os::unix::fs::PermissionsExt, path::Path};

use chrono::{DateTime, Datelike, Local, Timelike, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::domain::entities::{
    BrowserIntegration, Profile, Schedule, SiteBlockConfig, SiteBlockState,
};

pub const BASE_DIR: &str = "/etc/siteblock";
pub const CONFIG_PATH: &str = "/etc/siteblock/config.json";
pub const HOSTS_PATH: &str = "/etc/hosts";
pub const RUNTIME_DIR: &str = "/var/lib/siteblock";
pub const EFFECTIVE_STATE_PATH: &str = "/var/lib/siteblock/effective-state.json";
pub const FIREFOX_OWNERSHIP_PATH: &str = "/etc/siteblock/firefox-policy.sha256";
pub const FIREFOX_POLICY_PATH: &str = "/etc/firefox/policies/policies.json";
pub const BEGIN_MARKER: &str = "# BEGIN SITEBLOCK MANAGED";
pub const END_MARKER: &str = "# END SITEBLOCK MANAGED";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveState {
    pub active: bool,
    pub domains: Vec<String>,
    #[serde(default)]
    pub revision: u64,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: Option<String>,
}

pub fn domain_hosts(domain: &str) -> Vec<String> {
    let mut hosts = vec![domain.to_string(), format!("www.{}", domain)];
    if domain == "youtube.com" {
        hosts.extend([
            "m.youtube.com".to_string(),
            "music.youtube.com".to_string(),
            "youtu.be".to_string(),
            "www.youtu.be".to_string(),
            "youtube-nocookie.com".to_string(),
            "www.youtube-nocookie.com".to_string(),
        ]);
    }
    hosts
}

pub fn is_profile_active(profile: &Profile, now: DateTime<Local>) -> bool {
    if !profile.enabled || profile.domains.is_empty() {
        return false;
    }
    if profile.schedules.is_empty() {
        return true;
    }
    profile.schedules.iter().any(|s| applies_now(s, now))
}

pub fn get_active_profiles<'a>(
    config: &'a SiteBlockConfig,
    now: DateTime<Local>,
) -> Vec<&'a Profile> {
    if !config.enabled {
        return Vec::new();
    }
    config
        .profiles
        .iter()
        .filter(|p| is_profile_active(p, now))
        .collect()
}

pub fn effective_blocked_domains(config: &SiteBlockConfig, now: DateTime<Local>) -> Vec<String> {
    if !config.enabled {
        return Vec::new();
    }
    if !config.profiles.is_empty() {
        let mut domains = Vec::new();
        for profile in get_active_profiles(config, now) {
            for d in &profile.domains {
                if !domains.contains(d) {
                    domains.push(d.clone());
                }
            }
        }
        domains
    } else if should_block(config, now) {
        config.domains.clone()
    } else {
        Vec::new()
    }
}

pub fn blocked_hosts(config: &SiteBlockConfig) -> Vec<String> {
    let now = Local::now();
    let domains_to_block = effective_blocked_domains(config, now);
    let mut result = Vec::new();
    for domain in &domains_to_block {
        for host in domain_hosts(domain) {
            if !result.contains(&host) {
                result.push(host);
            }
        }
    }
    result
}

pub fn blocked_url_filters(config: &SiteBlockConfig, enabled: bool) -> Vec<String> {
    if !enabled {
        return Vec::new();
    }
    let mut filters = Vec::new();
    for host in blocked_hosts(config) {
        let pattern_any = format!("*://{}/*", host);
        let pattern_sub = format!("*://*.{}/*", host);
        if !filters.contains(&pattern_any) {
            filters.push(pattern_any);
        }
        if !filters.contains(&pattern_sub) {
            filters.push(pattern_sub);
        }
    }
    filters
}

pub fn parse_minute(time_str: &str) -> u32 {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() == 2 {
        let h: u32 = parts[0].parse().unwrap_or(0);
        let m: u32 = parts[1].parse().unwrap_or(0);
        h * 60 + m
    } else {
        0
    }
}

pub fn applies_now(schedule: &Schedule, now: DateTime<Local>) -> bool {
    let current_day = now.weekday().num_days_from_monday() as u8;
    let current_minute = now.hour() * 60 + now.minute();
    let start = parse_minute(&schedule.start);
    let end = parse_minute(&schedule.end);

    if start < end {
        schedule.days.contains(&current_day) && current_minute >= start && current_minute < end
    } else {
        let previous_day = if current_day == 0 { 6 } else { current_day - 1 };
        (schedule.days.contains(&current_day) && current_minute >= start)
            || (schedule.days.contains(&previous_day) && current_minute < end)
    }
}

pub fn should_block(config: &SiteBlockConfig, now: DateTime<Local>) -> bool {
    if !config.enabled {
        return false;
    }
    if !config.profiles.is_empty() {
        config.profiles.iter().any(|p| is_profile_active(p, now))
    } else {
        if config.domains.is_empty() {
            return false;
        }
        if config.schedules.is_empty() {
            return true;
        }
        config.schedules.iter().any(|s| applies_now(s, now))
    }
}

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
        for host in blocked_hosts(config) {
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

pub fn write_hosts_file(config: &SiteBlockConfig, enabled: bool) -> std::io::Result<()> {
    let original = fs::read_to_string(HOSTS_PATH).unwrap_or_default();
    let output = render_hosts_content(&original, config, enabled);
    let mode = fs::metadata(HOSTS_PATH)
        .map(|m| m.permissions().mode())
        .unwrap_or(0o644);

    atomic_write(Path::new(HOSTS_PATH), output.as_bytes(), mode)
}

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

pub fn get_admin_capabilities() -> serde_json::Value {
    serde_json::json!({
        "session": true,
        "browserIntegration": true,
        "integrationVersion": 3
    })
}

pub fn handle_admin_action_with<FRead, FApply>(
    request: &serde_json::Value,
    mut read_cfg: FRead,
    mut apply_cfg: FApply,
) -> serde_json::Value
where
    FRead: FnMut() -> SiteBlockConfig,
    FApply: FnMut(&SiteBlockConfig) -> SiteBlockState,
{
    let action = request.get("action").and_then(|v| v.as_str()).unwrap_or("");
    match action {
        "status" => {
            let cfg = read_cfg();
            let state = get_current_state(&cfg, None, None);
            serde_json::to_value(state).unwrap_or_else(|e| {
                serde_json::json!({ "error": format!("{}", e) })
            })
        }
        "capabilities" => get_admin_capabilities(),
        "set-config" => {
            if let Some(config_val) = request.get("config") {
                match serde_json::from_value::<SiteBlockConfig>(config_val.clone()) {
                    Ok(mut config) => {
                        config.ensure_migrated();
                        match config.validate() {
                            Ok(_) => {
                                let state = apply_cfg(&config);
                                serde_json::to_value(state).unwrap_or_else(|e| {
                                    serde_json::json!({ "error": format!("{}", e) })
                                })
                            }
                            Err(validation_err) => {
                                serde_json::json!({ "error": format!("{}", validation_err) })
                            }
                        }
                    }
                    Err(parse_err) => {
                        serde_json::json!({ "error": format!("Configuração inválida: {}", parse_err) })
                    }
                }
            } else {
                serde_json::json!({ "error": "Campo 'config' ausente no pedido." })
            }
        }
        _ => {
            serde_json::json!({ "error": format!("Ação desconhecida: {}", action) })
        }
    }
}

pub fn handle_admin_session_line_with<FRead, FApply>(
    line: &str,
    read_cfg: FRead,
    apply_cfg: FApply,
) -> String
where
    FRead: FnMut() -> SiteBlockConfig,
    FApply: FnMut(&SiteBlockConfig) -> SiteBlockState,
{
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    match serde_json::from_str::<serde_json::Value>(trimmed) {
        Ok(request) => {
            let response = handle_admin_action_with(&request, read_cfg, apply_cfg);
            serde_json::to_string(&response).unwrap_or_else(|e| format!("{{\"error\":\"{}\"}}", e))
        }
        Err(err) => {
            format!("{{\"error\":\"JSON inválido: {}\"}}", err)
        }
    }
}

fn command_exists(names: &[&str]) -> bool {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(':') {
            for name in names {
                let full = Path::new(dir).join(name);
                if full.is_file() {
                    return true;
                }
            }
        }
    }
    false
}

pub fn get_browser_integrations(
    chromium: &HashMap<String, bool>,
    firefox_policy: bool,
    enabled_browsers: &[String],
) -> Vec<BrowserIntegration> {
    let chrome_detected = command_exists(&["google-chrome", "google-chrome-stable"]);
    let brave_detected = command_exists(&["brave-browser", "brave"]);
    let firefox_detected = command_exists(&["firefox"]);

    vec![
        BrowserIntegration {
            name: "Chrome".to_string(),
            detected: chrome_detected,
            enabled: enabled_browsers.iter().any(|browser| browser == "Chrome"),
            policy_ready: enabled_browsers.iter().any(|browser| browser == "Chrome")
                && *chromium.get("Chrome").unwrap_or(&false),
            mode: browser_mode("Chrome", enabled_browsers),
        },
        BrowserIntegration {
            name: "Brave".to_string(),
            detected: brave_detected,
            enabled: enabled_browsers.iter().any(|browser| browser == "Brave"),
            policy_ready: enabled_browsers.iter().any(|browser| browser == "Brave")
                && *chromium.get("Brave").unwrap_or(&false),
            mode: browser_mode("Brave", enabled_browsers),
        },
        BrowserIntegration {
            name: "Firefox".to_string(),
            detected: firefox_detected,
            enabled: enabled_browsers.iter().any(|browser| browser == "Firefox"),
            policy_ready: enabled_browsers.iter().any(|browser| browser == "Firefox")
                && firefox_policy,
            mode: browser_mode("Firefox", enabled_browsers),
        },
    ]
}

fn browser_mode(name: &str, enabled_browsers: &[String]) -> String {
    if enabled_browsers.iter().any(|browser| browser == name) {
        "Política gerenciada".to_string()
    } else {
        "Desativado nas configurações".to_string()
    }
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
    let mut revision = previous.as_ref().map(|p| p.revision).unwrap_or(0);

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

    let revision = effective.map(|e| e.revision).unwrap_or(0);

    let now = Local::now();
    let active_profiles = get_active_profiles(config, now);
    let active_profile_ids: Vec<String> = active_profiles.iter().map(|p| p.id.clone()).collect();
    let effective_domains = effective_blocked_domains(config, now);

    let (legacy_domains, legacy_schedules) = if !config.profiles.is_empty() {
        (
            effective_domains.clone(),
            config.profiles.iter().flat_map(|p| p.schedules.clone()).collect(),
        )
    } else {
        (config.domains.clone(), config.schedules.clone())
    };

    SiteBlockState {
        active: is_hosts_blocking_active(),
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

    let _ = write_hosts_file(config, enabled);
    let filters = blocked_url_filters(config, enabled);
    let chromium = write_chromium_policies(&filters, &config.enabled_browsers);
    let ff_policy = if config.enabled_browsers.iter().any(|browser| browser == "Firefox") {
        write_firefox_policy(&filters)
    } else {
        remove_firefox_policy()
    };
    let _ = write_effective_state(config, enabled);
    flush_dns();

    get_current_state(config, Some(chromium), Some(ff_policy))
}

pub fn is_root() -> bool {
    extern "C" {
        fn geteuid() -> u32;
    }
    unsafe { geteuid() == 0 }
}

#[cfg(test)]
#[path = "system_core/tests.rs"]
mod tests;

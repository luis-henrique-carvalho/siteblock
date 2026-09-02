use std::{
    collections::HashMap,
    fs,
    io::Write,
    os::unix::fs::PermissionsExt,
    path::Path,
};

use chrono::{DateTime, Datelike, Local, Timelike, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::domain::entities::{BrowserIntegration, Schedule, SiteBlockConfig, SiteBlockState};

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

pub fn blocked_hosts(config: &SiteBlockConfig) -> Vec<String> {
    let mut result = Vec::new();
    for domain in &config.domains {
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
    if !config.enabled || config.domains.is_empty() {
        return false;
    }
    if config.schedules.is_empty() {
        return true;
    }
    config.schedules.iter().any(|s| applies_now(s, now))
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

pub fn write_hosts_file(config: &SiteBlockConfig, enabled: bool) -> std::io::Result<()> {
    let original = fs::read_to_string(HOSTS_PATH).unwrap_or_default();
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
        for domain in &config.domains {
            let aliases = domain_hosts(domain);
            let joined = aliases.join(" ");
            kept.push(format!("0.0.0.0 {}", joined));
            kept.push(format!("::1 {}", joined));
        }
        kept.push(END_MARKER.to_string());
    }

    let mode = fs::metadata(HOSTS_PATH)
        .map(|m| m.permissions().mode())
        .unwrap_or(0o644);

    let output = kept.join("\n").trim_end().to_string() + "\n";
    atomic_write(Path::new(HOSTS_PATH), output.as_bytes(), mode)
}

pub fn write_chromium_policies(filters: &[String]) -> HashMap<String, bool> {
    let policies = [
        ("Chrome", Path::new("/etc/opt/chrome/policies/managed/com.luis.siteblock.json")),
        ("Brave", Path::new("/etc/brave/policies/managed/com.luis.siteblock.json")),
    ];

    let mut results = HashMap::new();
    let body = serde_json::json!({ "URLBlocklist": filters });
    let content = serde_json::to_string_pretty(&body).unwrap_or_default() + "\n";

    for (name, path) in policies {
        let success = atomic_write(path, content.as_bytes(), 0o644).is_ok();
        results.insert(name.to_string(), success);
    }
    results
}

fn file_sha256(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Some(format!("{:x}", hasher.finalize()))
}

pub fn write_firefox_policy(filters: &[String]) -> bool {
    let policy_path = Path::new(FIREFOX_POLICY_PATH);
    let ownership_path = Path::new(FIREFOX_OWNERSHIP_PATH);

    let previous_digest = fs::read_to_string(ownership_path)
        .map(|s| s.trim().to_string())
        .ok();

    let current_digest = file_sha256(policy_path);

    if policy_path.exists() && previous_digest.is_some() && previous_digest != current_digest {
        log::warn!("Política do Firefox existente não pertence ao SiteBlock. Ignorando escrita.");
        return false;
    }

    let body = serde_json::json!({
        "policies": {
            "WebsiteFilter": {
                "Block": filters
            }
        }
    });
    let content = serde_json::to_string_pretty(&body).unwrap_or_default() + "\n";

    if atomic_write(policy_path, content.as_bytes(), 0o644).is_ok() {
        if let Some(digest) = file_sha256(policy_path) {
            let _ = atomic_write(ownership_path, digest.as_bytes(), 0o644);
        }
        true
    } else {
        false
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

pub fn get_browser_integrations(chromium: &HashMap<String, bool>, firefox_policy: bool) -> Vec<BrowserIntegration> {
    let chrome_detected = command_exists(&["google-chrome", "google-chrome-stable"]);
    let brave_detected = command_exists(&["brave-browser", "brave"]);
    let firefox_detected = command_exists(&["firefox"]);

    vec![
        BrowserIntegration {
            name: "Chrome".to_string(),
            detected: chrome_detected,
            policy_ready: *chromium.get("Chrome").unwrap_or(&false),
            mode: "Política gerenciada".to_string(),
        },
        BrowserIntegration {
            name: "Brave".to_string(),
            detected: brave_detected,
            policy_ready: *chromium.get("Brave").unwrap_or(&false),
            mode: "Política gerenciada".to_string(),
        },
        BrowserIntegration {
            name: "Firefox".to_string(),
            detected: firefox_detected,
            policy_ready: firefox_policy,
            mode: "Política gerenciada".to_string(),
        },
    ]
}

pub fn read_config() -> SiteBlockConfig {
    let path = Path::new(CONFIG_PATH);
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(cfg) = serde_json::from_str::<SiteBlockConfig>(&content) {
            return cfg;
        }
    }
    SiteBlockConfig::new(false, Vec::new(), Vec::new())
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

    let desired_domains = if enabled { blocked_hosts(config) } else { Vec::new() };
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
    let _ = std::process::Command::new("resolvectl").arg("flush-caches").status();
    let _ = std::process::Command::new("systemd-resolve").arg("--flush-caches").status();
    let _ = std::process::Command::new("nscd").args(["-i", "hosts"]).status();
}

pub fn get_current_state(
    config: &SiteBlockConfig,
    chromium_policies: Option<HashMap<String, bool>>,
    firefox_policy: Option<bool>,
) -> SiteBlockState {
    let chromium = chromium_policies.unwrap_or_else(|| {
        let mut map = HashMap::new();
        map.insert("Chrome".to_string(), Path::new("/etc/opt/chrome/policies/managed/com.luis.siteblock.json").exists());
        map.insert("Brave".to_string(), Path::new("/etc/brave/policies/managed/com.luis.siteblock.json").exists());
        map
    });

    let ff_policy = firefox_policy.unwrap_or_else(|| {
        Path::new(FIREFOX_POLICY_PATH).exists() && Path::new(FIREFOX_OWNERSHIP_PATH).exists()
    });

    let effective: Option<EffectiveState> = fs::read_to_string(EFFECTIVE_STATE_PATH)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok());

    let revision = effective.map(|e| e.revision).unwrap_or(0);

    SiteBlockState {
        active: is_hosts_blocking_active(),
        enabled: config.enabled,
        domains: config.domains.clone(),
        schedules: config.schedules.clone(),
        helper_installed: Path::new("/usr/local/lib/siteblock/siteblock-admin").exists(),
        session_supported: true,
        revision,
        browser_integrations: get_browser_integrations(&chromium, ff_policy),
    }
}

pub fn apply_config(config: &SiteBlockConfig) -> SiteBlockState {
    let now = Local::now();
    let enabled = should_block(config, now);

    let _ = write_hosts_file(config, enabled);
    let filters = blocked_url_filters(config, enabled);
    let chromium = write_chromium_policies(&filters);
    let ff_policy = write_firefox_policy(&filters);
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
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_domain_hosts_regular() {
        let hosts = domain_hosts("example.com");
        assert_eq!(hosts, vec!["example.com", "www.example.com"]);
    }

    #[test]
    fn test_domain_hosts_youtube() {
        let hosts = domain_hosts("youtube.com");
        assert!(hosts.contains(&"youtube.com".to_string()));
        assert!(hosts.contains(&"www.youtube.com".to_string()));
        assert!(hosts.contains(&"music.youtube.com".to_string()));
        assert!(hosts.contains(&"youtu.be".to_string()));
    }

    #[test]
    fn test_parse_minute() {
        assert_eq!(parse_minute("00:00"), 0);
        assert_eq!(parse_minute("09:30"), 570);
        assert_eq!(parse_minute("23:59"), 1439);
    }

    #[test]
    fn test_applies_now_same_day() {
        // Segunda-feira (day 0) 10:00
        let dt = Local.with_ymd_and_hms(2026, 8, 31, 10, 0, 0).unwrap(); // 2026-08-31 é Segunda
        let schedule = Schedule::new("test", vec![0], "09:00", "18:00");
        assert!(applies_now(&schedule, dt));

        // Fora do horário (08:00)
        let dt_early = Local.with_ymd_and_hms(2026, 8, 31, 8, 0, 0).unwrap();
        assert!(!applies_now(&schedule, dt_early));

        // Outro dia da semana (Terça-feira, day 1)
        let dt_tue = Local.with_ymd_and_hms(2026, 9, 1, 10, 0, 0).unwrap();
        assert!(!applies_now(&schedule, dt_tue));
    }

    #[test]
    fn test_applies_now_overnight() {
        // Horário das 22:00 até 06:00 na Segunda-feira (day 0)
        let schedule = Schedule::new("overnight", vec![0], "22:00", "06:00");

        // Segunda 23:00 -> ativo
        let dt_mon_night = Local.with_ymd_and_hms(2026, 8, 31, 23, 0, 0).unwrap();
        assert!(applies_now(&schedule, dt_mon_night));

        // Terça 03:00 -> ativo (pertence ao turno iniciado na Segunda)
        let dt_tue_early = Local.with_ymd_and_hms(2026, 9, 1, 3, 0, 0).unwrap();
        assert!(applies_now(&schedule, dt_tue_early));

        // Terça 07:00 -> inativo
        let dt_tue_morning = Local.with_ymd_and_hms(2026, 9, 1, 7, 0, 0).unwrap();
        assert!(!applies_now(&schedule, dt_tue_morning));
    }

    #[test]
    fn test_url_filters() {
        let cfg = SiteBlockConfig::new(true, vec!["instagram.com".to_string()], vec![]);
        let filters = blocked_url_filters(&cfg, true);
        assert!(filters.contains(&"*://instagram.com/*".to_string()));
        assert!(filters.contains(&"*://*.instagram.com/*".to_string()));
        assert!(filters.contains(&"*://www.instagram.com/*".to_string()));
    }
}


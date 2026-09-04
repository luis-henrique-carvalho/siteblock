use chrono::{Local, TimeZone};
use siteblock_lib::domain::entities::{Profile, Schedule, SiteBlockConfig, SiteBlockState};
use siteblock_lib::domain::errors::AppResult;
use siteblock_lib::domain::ports::SessionPort;
use siteblock_lib::infrastructure::{
    admin_protocol::get_admin_capabilities, browser_policy::build_chromium_policy_content,
    hosts::render_hosts_content,
};
use std::process::Child;
use std::sync::Mutex;

struct DummySession {
    last_action: Mutex<Option<String>>,
}

impl DummySession {
    fn new() -> Self {
        Self {
            last_action: Mutex::new(None),
        }
    }
}

impl SessionPort for DummySession {
    fn send_request(&self, request: serde_json::Value) -> AppResult<SiteBlockState> {
        if let Some(action) = request.get("action").and_then(|a| a.as_str()) {
            *self.last_action.lock().unwrap() = Some(action.to_string());
        }
        Ok(SiteBlockState::empty())
    }

    fn adopt_child(&self, _child: Child) -> AppResult<()> {
        Ok(())
    }
}

#[test]
fn test_schedule_applies_now_direct_domain_method() {
    let dt_monday_10 = Local.with_ymd_and_hms(2026, 8, 31, 10, 0, 0).unwrap();
    let schedule = Schedule::new("s1", vec![0], "09:00", "12:00");
    assert!(schedule.applies_now(dt_monday_10));

    let dt_monday_13 = Local.with_ymd_and_hms(2026, 8, 31, 13, 0, 0).unwrap();
    assert!(!schedule.applies_now(dt_monday_13));
}

#[test]
fn test_profile_is_active_direct_domain_method() {
    let dt_monday_10 = Local.with_ymd_and_hms(2026, 8, 31, 10, 0, 0).unwrap();
    let profile = Profile::new(
        "p1",
        "Trabalho",
        "target",
        "blue",
        true,
        vec!["facebook.com".into()],
        vec![Schedule::new("s1", vec![0], "09:00", "12:00")],
    );
    assert!(profile.is_active(dt_monday_10));

    let mut disabled_profile = profile.clone();
    disabled_profile.enabled = false;
    assert!(!disabled_profile.is_active(dt_monday_10));
}

#[test]
fn test_config_domain_methods_aggregation() {
    let dt_monday_10 = Local.with_ymd_and_hms(2026, 8, 31, 10, 0, 0).unwrap();
    let profile1 = Profile::new(
        "p1",
        "P1",
        "shield",
        "blue",
        true,
        vec!["instagram.com".into()],
        vec![Schedule::new("s1", vec![0], "09:00", "12:00")],
    );
    let profile2 = Profile::new(
        "p2",
        "P2",
        "shield",
        "emerald",
        true,
        vec!["twitter.com".into()],
        vec![], // 24/7
    );

    let config = SiteBlockConfig::new(true, vec![profile1, profile2]);
    let active_profiles = config.active_profiles(dt_monday_10);
    assert_eq!(active_profiles.len(), 2);

    let effective_domains = config.effective_blocked_domains(dt_monday_10);
    assert!(effective_domains.contains(&"instagram.com".to_string()));
    assert!(effective_domains.contains(&"twitter.com".to_string()));

    assert!(config.should_block(dt_monday_10));
    assert!(!config.blocked_hosts().is_empty());
}

#[test]
fn test_session_port_typed_default_methods() {
    let session = DummySession::new();
    let _ = session.status();
    assert_eq!(
        session.last_action.lock().unwrap().as_deref(),
        Some("status")
    );

    let config = SiteBlockConfig::new(true, vec![]);
    let _ = session.set_config(&config);
    assert_eq!(
        session.last_action.lock().unwrap().as_deref(),
        Some("set-config")
    );
}

#[test]
fn test_new_modules_integrity() {
    let caps = get_admin_capabilities();
    assert_eq!(caps.get("session").and_then(|v| v.as_bool()), Some(true));

    let policy_str = build_chromium_policy_content(&["*://*.reddit.com/*".into()]);
    assert!(policy_str.contains("URLBlocklist"));

    let hosts_out = render_hosts_content(
        "127.0.0.1 localhost",
        &SiteBlockConfig::new(false, vec![]),
        false,
    );
    assert!(hosts_out.contains("127.0.0.1 localhost"));
}

use siteblock_lib::domain::entities::{
    BrowserIntegration, Profile, Schedule, SiteBlockConfig, SiteBlockState,
};
use siteblock_lib::domain::errors::AppError;

#[test]
fn test_schedule_validation_success() {
    let schedule = Schedule::new("sched-1", vec![0, 1, 2, 3, 4, 5, 6], "08:00", "18:00");
    assert!(schedule.validate().is_ok());
}

#[test]
fn test_schedule_validation_empty_id() {
    let schedule = Schedule::new("   ", vec![1], "08:00", "18:00");
    let err = schedule.validate().unwrap_err();
    assert!(err.contains("vazio"));
}

#[test]
fn test_schedule_validation_invalid_day() {
    let schedule = Schedule::new("sched-1", vec![0, 7], "08:00", "18:00");
    let err = schedule.validate().unwrap_err();
    assert!(err.contains("Dia da semana inválido"));
}

#[test]
fn test_schedule_validation_invalid_time_format() {
    let invalid_formats = vec!["8:00", "08-00", "24:00", "08:60", "abc:10", "12"];
    for invalid in invalid_formats {
        let schedule = Schedule::new("sched-1", vec![1], invalid, "18:00");
        assert!(
            schedule.validate().is_err(),
            "Deveria falhar para {}",
            invalid
        );
    }
}

#[test]
fn test_config_validation_success() {
    let config = SiteBlockConfig::legacy(
        true,
        vec!["youtube.com".into(), "instagram.com".into()],
        vec![Schedule::new("s1", vec![1, 2], "09:00", "17:00")],
    );
    assert!(config.validate().is_ok());
}

#[test]
fn test_config_validation_invalid_domain() {
    let invalid_configs = vec![
        vec!["".into()],
        vec!["  ".into()],
        vec!["https://youtube.com".into()],
        vec!["youtube.com/watch".into()],
        vec!["bad domain.com".into()],
    ];

    for domains in invalid_configs {
        let config = SiteBlockConfig::legacy(true, domains, vec![]);
        assert!(config.validate().is_err());
    }
}

#[test]
fn test_config_validation_cascades_to_schedule() {
    let config = SiteBlockConfig::legacy(
        true,
        vec!["youtube.com".into()],
        vec![Schedule::new("s1", vec![1], "25:00", "17:00")],
    );
    assert!(config.validate().is_err());
}

#[test]
fn test_profile_validation_success() {
    let profile = Profile::new(
        "p1",
        "Trabalho",
        "target",
        "blue",
        true,
        vec!["twitter.com".into()],
        vec![Schedule::new("s1", vec![1], "09:00", "18:00")],
    );
    assert!(profile.validate().is_ok());
}

#[test]
fn test_profile_validation_empty_name() {
    let profile = Profile::new("p1", "   ", "target", "blue", true, vec![], vec![]);
    assert!(profile.validate().is_err());
}

#[test]
fn test_state_json_serialization_camel_case() {
    let state = SiteBlockState {
        active: true,
        enabled: true,
        profiles: vec![Profile::new("p1", "Foco", "target", "blue", true, vec!["facebook.com".into()], vec![])],
        active_profile_ids: vec!["p1".into()],
        effective_domains: vec!["facebook.com".into()],
        domains: vec!["facebook.com".into()],
        schedules: vec![Schedule::new("s1", vec![1], "09:00", "12:00")],
        helper_installed: true,
        session_supported: true,
        revision: 42,
        browser_integrations: vec![BrowserIntegration {
            name: "Chrome".into(),
            detected: true,
            policy_ready: true,
            mode: "Política gerenciada".into(),
        }],
        helper_outdated: false,
    };

    let serialized = serde_json::to_string(&state).unwrap();
    assert!(serialized.contains("\"helperInstalled\":true"));
    assert!(serialized.contains("\"sessionSupported\":true"));
    assert!(serialized.contains("\"browserIntegrations\":["));
    assert!(serialized.contains("\"policyReady\":true"));
    assert!(serialized.contains("\"activeProfileIds\":[\"p1\"]"));

    let deserialized: SiteBlockState = serde_json::from_str(&serialized).unwrap();
    assert_eq!(deserialized, state);
}

#[test]
fn test_empty_state_defaults() {
    let state = SiteBlockState::empty();
    assert!(!state.active);
    assert!(!state.enabled);
    assert!(!state.helper_installed);
    assert!(!state.session_supported);
    assert_eq!(state.revision, 0);
    assert!(state.domains.is_empty());
}

#[test]
fn test_app_error_display() {
    let err = AppError::AuthorizationDenied("Senha incorreta".into());
    assert!(err.to_string().contains("Autorização cancelada"));

    let err_val = AppError::ValidationError("Domínio inválido".into());
    assert!(err_val
        .to_string()
        .contains("Dados de configuração inválidos"));
}

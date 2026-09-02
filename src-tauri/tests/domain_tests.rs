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
fn test_profile_validation_empty_id() {
    let profile = Profile::new("   ", "Nome", "target", "blue", true, vec![], vec![]);
    let err = profile.validate().unwrap_err();
    assert!(err.contains("identificador do perfil não pode ser vazio"));
}

#[test]
fn test_profile_validation_empty_name() {
    let profile = Profile::new("p1", "   ", "target", "blue", true, vec![], vec![]);
    let err = profile.validate().unwrap_err();
    assert!(err.contains("nome do perfil não pode ser vazio"));
}

#[test]
fn test_profile_validation_empty_domain() {
    let profile = Profile::new("p1", "Nome", "target", "blue", true, vec!["   ".into()], vec![]);
    let err = profile.validate().unwrap_err();
    assert!(err.contains("O domínio não pode ser vazio"));
}

#[test]
fn test_profile_validation_invalid_domain_format() {
    let profile = Profile::new("p1", "Nome", "target", "blue", true, vec!["invalid domain.com".into()], vec![]);
    let err = profile.validate().unwrap_err();
    assert!(err.contains("Formato de domínio inválido"));
}

#[test]
fn test_profile_default_presets() {
    let presets = Profile::default_presets();
    assert_eq!(presets.len(), 3);
    assert_eq!(presets[0].id, "focus");
    assert_eq!(presets[1].id, "study");
    assert_eq!(presets[2].id, "sleep");
}

#[test]
fn test_profile_deserialization_defaults_icon_and_color() {
    let json_str = r#"{"id":"p-custom","name":"Custom","enabled":true,"domains":[],"schedules":[]}"#;
    let profile: Profile = serde_json::from_str(json_str).expect("Deveria desserializar com defaults");
    assert_eq!(profile.icon, "shield");
    assert_eq!(profile.color, "blue");
}

#[test]
fn test_config_ensure_migrated_from_empty_profiles_and_domains() {
    let mut config = SiteBlockConfig::new(false, vec![]);
    config.ensure_migrated();
    assert_eq!(config.profiles.len(), 3);
    assert_eq!(config.profiles[0].id, "focus");
}

#[test]
fn test_state_ensure_migrated_from_empty() {
    let mut state = SiteBlockState::empty();
    state.active = true;
    state.ensure_migrated();
    assert_eq!(state.profiles.len(), 3);
    assert_eq!(state.active_profile_ids, vec!["focus".to_string()]);
}

#[test]
fn test_state_default_trait() {
    let state_default = SiteBlockState::default();
    let state_empty = SiteBlockState::empty();
    assert_eq!(state_default, state_empty);
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
fn test_app_error_display_and_from_conversions() {
    let err_auth = AppError::AuthorizationDenied("Senha incorreta".into());
    assert!(err_auth.to_string().contains("Autorização cancelada"));

    let err_val = AppError::ValidationError("Domínio inválido".into());
    assert!(err_val
        .to_string()
        .contains("Dados de configuração inválidos"));

    let err_helper = AppError::HelperNotInstalled;
    assert!(err_helper.to_string().contains("helper de administração não está instalado"));

    let err_sess = AppError::SessionUnavailable("pipe quebrado".into());
    assert!(err_sess.to_string().contains("sessão administrativa está indisponível"));

    let err_resp = AppError::InvalidResponse("resposta truncada".into());
    assert!(err_resp.to_string().contains("Resposta inválida"));

    let err_inst = AppError::InstallationFailed("disco cheio".into());
    assert!(err_inst.to_string().contains("Erro durante a instalação"));

    // Conversões From
    let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "arquivo ausente");
    let app_io_err: AppError = io_err.into();
    assert!(matches!(app_io_err, AppError::IoError(_)));

    let json_err = serde_json::from_str::<bool>("not a bool").unwrap_err();
    let app_json_err: AppError = json_err.into();
    assert!(matches!(app_json_err, AppError::SerializationError(_)));

    let app_str_err: AppError = "erro de texto".into();
    assert_eq!(app_str_err.to_string(), "erro de texto");

    let app_string_err: AppError = String::from("outro erro").into();
    assert_eq!(app_string_err.to_string(), "outro erro");
}

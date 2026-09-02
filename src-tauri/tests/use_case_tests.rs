mod common;

use common::mocks::{MockHelperPort, MockInstallerPort, MockSessionPort};
use serde_json::json;
use siteblock_lib::application::use_cases::{
    GetStatusUseCase, InstallServiceUseCase, SaveConfigUseCase, StartSessionUseCase,
};
use siteblock_lib::domain::entities::{Schedule, SiteBlockConfig, SiteBlockState};
use siteblock_lib::domain::errors::AppError;
use std::sync::Arc;

fn create_sample_state(active: bool) -> SiteBlockState {
    let mut state = SiteBlockState {
        active,
        enabled: true,
        profiles: vec![],
        active_profile_ids: vec![],
        effective_domains: vec!["tiktok.com".into()],
        domains: vec!["tiktok.com".into()],
        schedules: vec![Schedule::new("s1", vec![1], "10:00", "12:00")],
        helper_installed: true,
        session_supported: true,
        revision: 1,
        browser_integrations: vec![],
    };
    state.ensure_migrated();
    state
}

#[test]
fn test_get_status_when_helper_not_installed() {
    let mock_helper = Arc::new(MockHelperPort::new(false, false, Ok(String::new())));
    let use_case = GetStatusUseCase::new(mock_helper);

    let result = use_case
        .execute()
        .expect("Deveria retornar estado sem erro");
    assert_eq!(result, SiteBlockState::empty());
}

#[test]
fn test_get_status_when_helper_installed_success() {
    let sample = create_sample_state(true);
    let sample_json = serde_json::to_string(&sample).unwrap();
    let mock_helper = Arc::new(MockHelperPort::new(true, true, Ok(sample_json)));
    let use_case = GetStatusUseCase::new(mock_helper);

    let result = use_case
        .execute()
        .expect("Deveria obter status com sucesso");
    assert!(result.active);
    assert!(result.session_supported);
    assert_eq!(result.domains, vec!["tiktok.com"]);
}

#[test]
fn test_get_status_when_helper_returns_invalid_json() {
    let mock_helper = Arc::new(MockHelperPort::new(true, true, Ok("invalid-json".into())));
    let use_case = GetStatusUseCase::new(mock_helper);

    let result = use_case.execute();
    assert!(matches!(result, Err(AppError::InvalidResponse(_))));
}

#[test]
fn test_start_session_when_helper_not_installed() {
    let mock_helper = Arc::new(MockHelperPort::new(false, false, Ok(String::new())));
    let mock_session = Arc::new(MockSessionPort::new(Ok(create_sample_state(true))));
    let use_case = StartSessionUseCase::new(mock_helper, mock_session.clone());

    let result = use_case.execute().expect("Deveria retornar estado vazio");
    assert_eq!(result, SiteBlockState::empty());
    assert!(mock_session.last_request().is_none());
}

#[test]
fn test_start_session_when_helper_installed() {
    let expected_state = create_sample_state(true);
    let mock_helper = Arc::new(MockHelperPort::new(true, true, Ok(String::new())));
    let mock_session = Arc::new(MockSessionPort::new(Ok(expected_state.clone())));
    let use_case = StartSessionUseCase::new(mock_helper, mock_session.clone());

    let result = use_case.execute().expect("Deveria iniciar sessão");
    assert_eq!(result, expected_state);
    assert_eq!(
        mock_session.last_request(),
        Some(json!({ "action": "status" }))
    );
}

#[test]
fn test_save_config_with_valid_config() {
    let expected_state = create_sample_state(true);
    let mock_session = Arc::new(MockSessionPort::new(Ok(expected_state.clone())));
    let use_case = SaveConfigUseCase::new(mock_session.clone());

    let config = SiteBlockConfig::legacy(
        true,
        vec!["reddit.com".into()],
        vec![Schedule::new("s1", vec![1], "10:00", "12:00")],
    );

    let mut expected_config = config.clone();
    expected_config.ensure_migrated();

    let result = use_case
        .execute(config)
        .expect("Deveria salvar configuração");
    assert_eq!(result, expected_state);
    assert_eq!(
        mock_session.last_request(),
        Some(json!({ "action": "set-config", "config": expected_config }))
    );
}

#[test]
fn test_save_config_with_invalid_domain_fails_without_calling_session() {
    let mock_session = Arc::new(MockSessionPort::new(Ok(create_sample_state(true))));
    let use_case = SaveConfigUseCase::new(mock_session.clone());

    let invalid_config = SiteBlockConfig::legacy(true, vec!["https://invalid.com".into()], vec![]);

    let result = use_case.execute(invalid_config);
    assert!(matches!(result, Err(AppError::ValidationError(_))));
    assert!(mock_session.last_request().is_none());
}

#[test]
fn test_install_service_success() {
    let expected_state = create_sample_state(false);
    let mock_installer = Arc::new(MockInstallerPort::success());
    let mock_session = Arc::new(MockSessionPort::new(Ok(expected_state.clone())));
    let use_case = InstallServiceUseCase::new(mock_installer, mock_session.clone());

    let result = use_case
        .execute()
        .expect("Deveria instalar e retornar estado");
    assert_eq!(result, expected_state);
    assert_eq!(*mock_session.adopted_count.lock().unwrap(), 1);
    assert_eq!(
        mock_session.last_request(),
        Some(json!({ "action": "status" }))
    );
}

#[test]
fn test_install_service_failure() {
    let mock_installer = Arc::new(MockInstallerPort::failure());
    let mock_session = Arc::new(MockSessionPort::new(Ok(create_sample_state(false))));
    let use_case = InstallServiceUseCase::new(mock_installer, mock_session.clone());

    let result = use_case.execute();
    assert!(matches!(result, Err(AppError::AuthorizationDenied(_))));
    assert_eq!(*mock_session.adopted_count.lock().unwrap(), 0);
    assert!(mock_session.last_request().is_none());
}

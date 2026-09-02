mod common;

use common::mocks::{MockHelperPort, MockSessionPort};
use serde_json::json;
use siteblock_lib::application::use_cases::{
    SaveConfigUseCase, StartSessionUseCase, ToggleBlockingUseCase,
};
use siteblock_lib::domain::entities::{Schedule, SiteBlockConfig, SiteBlockState};
use siteblock_lib::domain::errors::AppError;
use siteblock_lib::domain::ports::{HelperPort, SessionPort};
use siteblock_lib::presentation::{TrayStateView, TrayViewModel};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

fn create_sample_state(enabled: bool, active: bool, helper_installed: bool) -> SiteBlockState {
    SiteBlockState {
        active,
        enabled,
        domains: vec!["youtube.com".into(), "instagram.com".into()],
        schedules: vec![Schedule::new("s1", vec![1, 2, 3], "08:00", "18:00")],
        helper_installed,
        session_supported: true,
        revision: 1,
        browser_integrations: vec![],
    }
}

// -----------------------------------------------------------------------------
// Testes de derivação dos textos e estados da bandeja (TrayViewModel)
// -----------------------------------------------------------------------------

#[test]
fn test_tray_derivation_without_helper() {
    let state = create_sample_state(false, false, false);
    let vm = TrayViewModel::from_state_view(&TrayStateView::Normal(state), None);

    assert_eq!(vm.status_text, "Integração necessária");
    assert_eq!(vm.action_text, "Ativar bloqueio");
    assert!(!vm.action_enabled);
    assert_eq!(vm.tooltip, "SiteBlock — Integração necessária");
}

#[test]
fn test_tray_derivation_disabled() {
    let state = create_sample_state(false, false, true);
    let vm = TrayViewModel::from_state_view(&TrayStateView::Normal(state), None);

    assert_eq!(vm.status_text, "Bloqueio desativado");
    assert_eq!(vm.action_text, "Ativar bloqueio");
    assert!(vm.action_enabled);
    assert_eq!(vm.tooltip, "SiteBlock — Bloqueio desativado");
}

#[test]
fn test_tray_derivation_active() {
    let state = create_sample_state(true, true, true);
    let vm = TrayViewModel::from_state_view(&TrayStateView::Normal(state), None);

    assert_eq!(vm.status_text, "Proteção ativa");
    assert_eq!(vm.action_text, "Desativar bloqueio");
    assert!(vm.action_enabled);
    assert_eq!(vm.tooltip, "SiteBlock — Proteção ativa");
}

#[test]
fn test_tray_derivation_enabled_outside_schedule() {
    let state = create_sample_state(true, false, true);
    let vm = TrayViewModel::from_state_view(&TrayStateView::Normal(state), None);

    assert_eq!(vm.status_text, "Habilitado — fora do horário");
    assert_eq!(vm.action_text, "Desativar bloqueio");
    assert!(vm.action_enabled);
    assert_eq!(vm.tooltip, "SiteBlock — Habilitado — fora do horário");
}

#[test]
fn test_tray_derivation_busy() {
    let state = create_sample_state(true, true, true);
    let vm = TrayViewModel::from_state_view(&TrayStateView::Busy, Some(&state));

    assert_eq!(vm.status_text, "Processando…");
    assert_eq!(vm.action_text, "Processando…");
    assert!(!vm.action_enabled);
    assert_eq!(vm.tooltip, "SiteBlock — Processando…");
}

#[test]
fn test_tray_derivation_error_with_previous_enabled_state() {
    let state = create_sample_state(true, true, true);
    let vm = TrayViewModel::from_state_view(&TrayStateView::Error, Some(&state));

    assert_eq!(vm.status_text, "Status indisponível — abra o painel");
    assert_eq!(vm.action_text, "Desativar bloqueio");
    assert!(!vm.action_enabled);
    assert_eq!(
        vm.tooltip,
        "SiteBlock — Status indisponível — abra o painel"
    );
}

#[test]
fn test_tray_derivation_error_without_previous_state() {
    let vm = TrayViewModel::from_state_view(&TrayStateView::Error, None);

    assert_eq!(vm.status_text, "Status indisponível — abra o painel");
    assert_eq!(vm.action_text, "Ativar bloqueio");
    assert!(!vm.action_enabled);
    assert_eq!(
        vm.tooltip,
        "SiteBlock — Status indisponível — abra o painel"
    );
}

// -----------------------------------------------------------------------------
// Testes do caso de uso ToggleBlockingUseCase
// -----------------------------------------------------------------------------

#[test]
fn test_toggle_blocking_inverts_enabled_and_preserves_domains_and_schedules() {
    let initial_state = create_sample_state(false, false, true);

    let mock_helper: Arc<dyn HelperPort> =
        Arc::new(MockHelperPort::new(true, true, Ok(String::new())));
    let mock_session = Arc::new(MockSessionPort::new(Ok(initial_state.clone())));

    let start_session = Arc::new(StartSessionUseCase::new(
        Arc::clone(&mock_helper),
        Arc::clone(&mock_session) as Arc<dyn SessionPort>,
    ));
    let save_config = Arc::new(SaveConfigUseCase::new(
        Arc::clone(&mock_session) as Arc<dyn SessionPort>
    ));
    let toggle_use_case = ToggleBlockingUseCase::new(start_session, save_config);

    // Toggle: false -> true
    let result = toggle_use_case.execute().expect("Toggle deve ter sucesso");
    assert_eq!(result.domains, vec!["youtube.com", "instagram.com"]);

    let last_req = mock_session
        .last_request()
        .expect("Deveria enviar requisição");
    assert_eq!(
        last_req,
        json!({
            "action": "set-config",
            "config": SiteBlockConfig::new(
                true,
                vec!["youtube.com".into(), "instagram.com".into()],
                vec![Schedule::new("s1", vec![1, 2, 3], "08:00", "18:00")]
            )
        })
    );
}

#[test]
fn test_toggle_blocking_fails_when_helper_not_installed() {
    let mock_helper: Arc<dyn HelperPort> =
        Arc::new(MockHelperPort::new(false, false, Ok(String::new())));
    let mock_session = Arc::new(MockSessionPort::new(Ok(SiteBlockState::empty())));

    let start_session = Arc::new(StartSessionUseCase::new(
        Arc::clone(&mock_helper),
        Arc::clone(&mock_session) as Arc<dyn SessionPort>,
    ));
    let save_config = Arc::new(SaveConfigUseCase::new(
        Arc::clone(&mock_session) as Arc<dyn SessionPort>
    ));
    let toggle_use_case = ToggleBlockingUseCase::new(start_session, save_config);

    let result = toggle_use_case.execute();
    assert!(result.is_err());
    assert_eq!(result.unwrap_err().to_string(), "Integração necessária");
    assert!(mock_session.last_request().is_none());
}

#[test]
fn test_toggle_blocking_fails_when_session_unavailable() {
    let mock_helper: Arc<dyn HelperPort> =
        Arc::new(MockHelperPort::new(true, true, Ok(String::new())));
    let mock_session = Arc::new(MockSessionPort::new(Err(AppError::SessionUnavailable(
        "Canais indisponíveis".into(),
    ))));

    let start_session = Arc::new(StartSessionUseCase::new(
        Arc::clone(&mock_helper),
        Arc::clone(&mock_session) as Arc<dyn SessionPort>,
    ));
    let save_config = Arc::new(SaveConfigUseCase::new(
        Arc::clone(&mock_session) as Arc<dyn SessionPort>
    ));
    let toggle_use_case = ToggleBlockingUseCase::new(start_session, save_config);

    let result = toggle_use_case.execute();
    assert!(matches!(result, Err(AppError::SessionUnavailable(_))));
}

#[test]
fn test_toggle_blocking_fails_when_authorization_denied() {
    let mock_helper: Arc<dyn HelperPort> =
        Arc::new(MockHelperPort::new(true, true, Ok(String::new())));
    let mock_session = Arc::new(MockSessionPort::new(Err(AppError::AuthorizationDenied(
        "Autenticação negada".into(),
    ))));

    let start_session = Arc::new(StartSessionUseCase::new(
        Arc::clone(&mock_helper),
        Arc::clone(&mock_session) as Arc<dyn SessionPort>,
    ));
    let save_config = Arc::new(SaveConfigUseCase::new(
        Arc::clone(&mock_session) as Arc<dyn SessionPort>
    ));
    let toggle_use_case = ToggleBlockingUseCase::new(start_session, save_config);

    let result = toggle_use_case.execute();
    assert!(matches!(result, Err(AppError::AuthorizationDenied(_))));
}

#[test]
fn test_toggle_blocking_prevents_concurrent_clicks() {
    let mock_helper: Arc<dyn HelperPort> =
        Arc::new(MockHelperPort::new(true, true, Ok(String::new())));
    let mock_session = Arc::new(MockSessionPort::new(Ok(create_sample_state(
        false, false, true,
    ))));

    let start_session = Arc::new(StartSessionUseCase::new(
        Arc::clone(&mock_helper),
        Arc::clone(&mock_session) as Arc<dyn SessionPort>,
    ));
    let save_config = Arc::new(SaveConfigUseCase::new(
        Arc::clone(&mock_session) as Arc<dyn SessionPort>
    ));

    let shared_flag = Arc::new(AtomicBool::new(true));
    let toggle_use_case =
        ToggleBlockingUseCase::with_busy_flag(start_session, save_config, Arc::clone(&shared_flag));

    let result = toggle_use_case.execute();
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("já em andamento"));
    assert!(mock_session.last_request().is_none());

    // Após o lock liberar, o toggle funciona normalmente
    shared_flag.store(false, Ordering::SeqCst);
    let result_after = toggle_use_case.execute();
    assert!(result_after.is_ok());
}

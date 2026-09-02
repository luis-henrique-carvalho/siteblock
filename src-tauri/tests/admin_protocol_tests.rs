use serde_json::json;
use siteblock_lib::domain::entities::{Profile, SiteBlockConfig, SiteBlockState};
use siteblock_lib::infrastructure::system_core::{
    get_admin_capabilities, handle_admin_action_with, handle_admin_session_line_with,
};

fn dummy_config() -> SiteBlockConfig {
    let profile = Profile::new(
        "p1",
        "Foco",
        "brain",
        "#3b82f6",
        true,
        vec!["reddit.com".to_string()],
        vec![],
    );
    SiteBlockConfig::new(true, vec![profile])
}

fn dummy_state() -> SiteBlockState {
    SiteBlockState {
        active: true,
        enabled: true,
        profiles: vec![],
        active_profile_ids: vec!["p1".to_string()],
        effective_domains: vec!["reddit.com".to_string()],
        domains: vec!["reddit.com".to_string()],
        schedules: vec![],
        helper_installed: true,
        session_supported: true,
        revision: 1,
        browser_integrations: vec![],
        helper_outdated: false,
    }
}

#[test]
fn test_get_admin_capabilities_structure() {
    let caps = get_admin_capabilities();
    assert_eq!(caps.get("session").and_then(|v| v.as_bool()), Some(true));
    assert_eq!(
        caps.get("browserIntegration").and_then(|v| v.as_bool()),
        Some(true)
    );
    assert_eq!(
        caps.get("integrationVersion").and_then(|v| v.as_u64()),
        Some(2)
    );
}

#[test]
fn test_admin_action_status() {
    let request = json!({ "action": "status" });
    let response = handle_admin_action_with(
        &request,
        dummy_config,
        |_| dummy_state(),
    );

    assert!(response.get("active").is_some());
    assert!(response.get("enabled").is_some());
    assert!(response.get("error").is_none());
}

#[test]
fn test_admin_action_capabilities() {
    let request = json!({ "action": "capabilities" });
    let response = handle_admin_action_with(
        &request,
        dummy_config,
        |_| dummy_state(),
    );

    assert_eq!(response.get("session").and_then(|v| v.as_bool()), Some(true));
}

#[test]
fn test_admin_action_set_config_valid() {
    let config = dummy_config();
    let request = json!({
        "action": "set-config",
        "config": config
    });

    let mut applied = false;
    let response = handle_admin_action_with(
        &request,
        dummy_config,
        |cfg| {
            applied = true;
            assert_eq!(cfg.profiles.len(), 1);
            dummy_state()
        },
    );

    assert!(applied);
    assert_eq!(response.get("active").and_then(|v| v.as_bool()), Some(true));
    assert!(response.get("error").is_none());
}

#[test]
fn test_admin_action_set_config_invalid_domain_fails_validation() {
    let mut invalid_config = dummy_config();
    invalid_config.profiles[0].domains = vec!["invalid domain with spaces".to_string()];

    let request = json!({
        "action": "set-config",
        "config": invalid_config
    });

    let response = handle_admin_action_with(
        &request,
        dummy_config,
        |_| panic!("Não deveria aplicar configuração inválida!"),
    );

    let error = response.get("error").and_then(|v| v.as_str()).unwrap_or("");
    assert!(error.to_lowercase().contains("domínio inválido"));
}

#[test]
fn test_admin_action_set_config_missing_config_field() {
    let request = json!({ "action": "set-config" });
    let response = handle_admin_action_with(
        &request,
        dummy_config,
        |_| dummy_state(),
    );

    let error = response.get("error").and_then(|v| v.as_str()).unwrap_or("");
    assert_eq!(error, "Campo 'config' ausente no pedido.");
}

#[test]
fn test_admin_action_unknown() {
    let request = json!({ "action": "non-existent-action" });
    let response = handle_admin_action_with(
        &request,
        dummy_config,
        |_| dummy_state(),
    );

    let error = response.get("error").and_then(|v| v.as_str()).unwrap_or("");
    assert_eq!(error, "Ação desconhecida: non-existent-action");
}

#[test]
fn test_admin_session_line_valid_and_malformed() {
    // Linha vazia não deve produzir resposta
    assert_eq!(
        handle_admin_session_line_with("   ", dummy_config, |_| dummy_state()),
        ""
    );

    // Linha com JSON malformado
    let err_line = handle_admin_session_line_with("{ broken json", dummy_config, |_| dummy_state());
    assert!(err_line.contains("JSON inválido"));

    // Linha válida
    let ok_line = handle_admin_session_line_with(
        "{\"action\": \"capabilities\"}",
        dummy_config,
        |_| dummy_state(),
    );
    assert!(ok_line.contains("\"session\":true"));
}

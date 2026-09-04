use crate::domain::entities::{
    FocusStatistics, FocusStatisticsQuery, SiteBlockConfig, SiteBlockState,
};
use crate::presentation::state::AppState;
use crate::presentation::TrayController;
use std::time::Instant;
use tauri::{AppHandle, Manager};

fn sync_tray(app: &AppHandle, state: &SiteBlockState) {
    if let Some(tray) = app.try_state::<TrayController>() {
        tray.update_state(state);
    }
}

#[tauri::command]
pub fn get_focus_statistics(
    query: FocusStatisticsQuery,
    state: tauri::State<'_, AppState>,
) -> Result<FocusStatistics, String> {
    state
        .get_focus_statistics_use_case
        .execute(query)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_siteblock_status(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    log::debug!(target: "siteblock::state", "[State] Invocando command: get_siteblock_status");
    let start = Instant::now();
    let result = state.get_status_use_case.execute().map_err(|err| {
        log::error!(target: "siteblock::state", "[State] Erro em get_siteblock_status: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        log::debug!(
            target: "siteblock::state",
            "[State] get_siteblock_status concluído em {:?} (active={}, enabled={})",
            start.elapsed(),
            s.active,
            s.enabled
        );
    }
    result
}

#[tauri::command]
pub fn start_privileged_session(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    log::info!(target: "siteblock::session", "[Session] Invocando command: start_privileged_session");
    let start = Instant::now();
    let result = state.start_session_use_case.execute().map_err(|err| {
        log::warn!(target: "siteblock::session", "[Session] Erro em start_privileged_session: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        log::info!(
            target: "siteblock::session",
            "[Session] start_privileged_session concluído com sucesso em {:?}",
            start.elapsed()
        );
    }
    result
}

#[tauri::command]
pub fn log_client_message(
    level: String,
    domain: Option<String>,
    category: Option<String>,
    message: String,
) {
    let domain_tag = domain.or(category).unwrap_or_else(|| "General".to_string());
    let target = format!("siteblock::ui::{}", domain_tag.to_lowercase());
    match level.to_uppercase().as_str() {
        "DEBUG" => log::debug!(target: &target, "[UI:{}] {}", domain_tag, message),
        "WARN" => log::warn!(target: &target, "[UI:{}] {}", domain_tag, message),
        "ERROR" => log::error!(target: &target, "[UI:{}] {}", domain_tag, message),
        _ => log::info!(target: &target, "[UI:{}] {}", domain_tag, message),
    }
}

#[tauri::command]
pub fn save_siteblock_config(
    app: AppHandle,
    config: SiteBlockConfig,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    let profiles_info: Vec<String> = config
        .profiles
        .iter()
        .map(|p| {
            format!(
                "{}(ativo={}, domínios={}, agendas={})",
                p.name,
                p.enabled,
                p.domains.len(),
                p.schedules.len()
            )
        })
        .collect();

    log::info!(
        target: "siteblock::config",
        "[Config] Salvando estado mestre: enabled={} | Perfis [{}]: {}",
        config.enabled,
        config.profiles.len(),
        profiles_info.join(", ")
    );
    let start = Instant::now();
    let result = state.save_config_use_case.execute(config).map_err(|err| {
        log::error!(target: "siteblock::config", "[Config] Erro em save_siteblock_config: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        crate::infrastructure::system_core::trigger_browser_policy_reload(&s.enabled_browsers);
        log::info!(
            target: "siteblock::protection",
            "[Protection] Proteção ativa={} | Perfis em vigor={:?} | Domínios efetivos={} (em {:?})",
            s.active,
            s.active_profile_ids,
            s.effective_domains.len(),
            start.elapsed()
        );
    }
    result
}

#[tauri::command]
pub fn install_siteblock_service(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    log::info!(target: "siteblock::service", "[Service] Invocando command: install_siteblock_service");
    let start = Instant::now();
    let result = state.install_service_use_case.execute().map_err(|err| {
        log::error!(target: "siteblock::service", "[Service] Erro em install_siteblock_service: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        log::info!(
            target: "siteblock::service",
            "[Service] install_siteblock_service concluído com sucesso em {:?}",
            start.elapsed()
        );
    }
    result
}

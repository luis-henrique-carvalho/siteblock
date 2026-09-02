use crate::domain::entities::{SiteBlockConfig, SiteBlockState};
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
pub fn get_siteblock_status(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    log::debug!("Invocando command: get_siteblock_status");
    let start = Instant::now();
    let result = state.get_status_use_case.execute().map_err(|err| {
        log::error!("Erro em get_siteblock_status: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        log::debug!(
            "get_siteblock_status concluído em {:?} (active={}, enabled={})",
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
    log::info!("Invocando command: start_privileged_session");
    let start = Instant::now();
    let result = state.start_session_use_case.execute().map_err(|err| {
        log::warn!("Erro em start_privileged_session: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        log::info!(
            "start_privileged_session concluído com sucesso em {:?}",
            start.elapsed()
        );
    }
    result
}

#[tauri::command]
pub fn save_siteblock_config(
    app: AppHandle,
    config: SiteBlockConfig,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    log::info!(
        "Invocando command: save_siteblock_config (enabled={}, profiles={}, legacy_domains={:?})",
        config.enabled,
        config.profiles.len(),
        config.domains
    );
    let start = Instant::now();
    let result = state.save_config_use_case.execute(config).map_err(|err| {
        log::error!("Erro em save_siteblock_config: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        log::info!(
            "save_siteblock_config concluído em {:?} (active={}, revision={})",
            start.elapsed(),
            s.active,
            s.revision
        );
    }
    result
}

#[tauri::command]
pub fn install_siteblock_service(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    log::info!("Invocando command: install_siteblock_service");
    let start = Instant::now();
    let result = state.install_service_use_case.execute().map_err(|err| {
        log::error!("Erro em install_siteblock_service: {err}");
        err.to_string()
    });
    if let Ok(ref s) = result {
        sync_tray(&app, s);
        log::info!(
            "install_siteblock_service concluído com sucesso em {:?}",
            start.elapsed()
        );
    }
    result
}

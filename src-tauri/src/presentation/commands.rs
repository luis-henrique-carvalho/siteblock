use crate::domain::entities::{SiteBlockConfig, SiteBlockState};
use crate::presentation::state::AppState;

#[tauri::command]
pub fn get_siteblock_status(
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    state
        .get_status_use_case
        .execute()
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn start_privileged_session(
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    state
        .start_session_use_case
        .execute()
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn save_siteblock_config(
    config: SiteBlockConfig,
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    state
        .save_config_use_case
        .execute(config)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn install_siteblock_service(
    state: tauri::State<'_, AppState>,
) -> Result<SiteBlockState, String> {
    state
        .install_service_use_case
        .execute()
        .map_err(|err| err.to_string())
}

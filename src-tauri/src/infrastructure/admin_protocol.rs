use std::path::Path;

use chrono::Local;

use crate::domain::entities::{
    FocusStatistics, FocusStatisticsQuery, SiteBlockConfig, SiteBlockState,
};
use crate::infrastructure::focus_stats::FocusStatsStore;
use crate::infrastructure::system_core::{get_current_state, FOCUS_STATS_DIRECTORY};

pub fn get_admin_capabilities() -> serde_json::Value {
    serde_json::json!({
        "session": true,
        "browserIntegration": true,
        "integrationVersion": 4
    })
}

pub fn handle_admin_action_with<FRead, FApply>(
    request: &serde_json::Value,
    mut read_cfg: FRead,
    mut apply_cfg: FApply,
) -> serde_json::Value
where
    FRead: FnMut() -> SiteBlockConfig,
    FApply: FnMut(&SiteBlockConfig) -> SiteBlockState,
{
    let action = request.get("action").and_then(|v| v.as_str()).unwrap_or("");
    match action {
        "status" => {
            let cfg = read_cfg();
            let state = get_current_state(&cfg, None, None);
            serde_json::to_value(state)
                .unwrap_or_else(|e| serde_json::json!({ "error": format!("{}", e) }))
        }
        "capabilities" => get_admin_capabilities(),
        "set-config" => {
            if let Some(config_val) = request.get("config") {
                match serde_json::from_value::<SiteBlockConfig>(config_val.clone()) {
                    Ok(mut config) => {
                        config.ensure_migrated();
                        match config.validate() {
                            Ok(()) => {
                                let state = apply_cfg(&config);
                                serde_json::to_value(state).unwrap_or_else(
                                    |e| serde_json::json!({ "error": format!("{}", e) }),
                                )
                            }
                            Err(validation_err) => {
                                serde_json::json!({ "error": validation_err })
                            }
                        }
                    }
                    Err(parse_err) => {
                        serde_json::json!({ "error": format!("Configuração inválida: {}", parse_err) })
                    }
                }
            } else {
                serde_json::json!({ "error": "Campo 'config' ausente no pedido." })
            }
        }
        _ => {
            serde_json::json!({ "error": format!("Ação desconhecida: {}", action) })
        }
    }
}

pub fn handle_admin_session_line_with<FRead, FApply>(
    line: &str,
    read_cfg: FRead,
    apply_cfg: FApply,
) -> String
where
    FRead: FnMut() -> SiteBlockConfig,
    FApply: FnMut(&SiteBlockConfig) -> SiteBlockState,
{
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    match serde_json::from_str::<serde_json::Value>(trimmed) {
        Ok(request) => {
            let response = handle_admin_action_with(&request, read_cfg, apply_cfg);
            serde_json::to_string(&response).unwrap_or_else(|e| format!("{{\"error\":\"{}\"}}", e))
        }
        Err(err) => {
            format!("{{\"error\":\"JSON inválido: {}\"}}", err)
        }
    }
}

pub fn query_focus_statistics(
    config: &SiteBlockConfig,
    query: &FocusStatisticsQuery,
) -> Result<FocusStatistics, String> {
    if let Some(profile_id) = &query.profile_id {
        if !config
            .profiles
            .iter()
            .any(|profile| profile.id == *profile_id)
        {
            return Err("perfil de estatísticas não encontrado".into());
        }
    }
    FocusStatsStore::at_directory(Path::new(FOCUS_STATS_DIRECTORY))?.query(query, Local::now())
}

#[allow(unsafe_code)]
pub fn is_root() -> bool {
    extern "C" {
        fn geteuid() -> u32;
    }
    unsafe { geteuid() == 0 }
}

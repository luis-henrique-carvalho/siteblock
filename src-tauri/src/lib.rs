pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod presentation;

pub use presentation::AppState;
use presentation::commands::{
    get_siteblock_status, install_siteblock_service, save_siteblock_config,
    start_privileged_session,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("siteblock".into()),
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_siteblock_status,
            start_privileged_session,
            save_siteblock_config,
            install_siteblock_service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

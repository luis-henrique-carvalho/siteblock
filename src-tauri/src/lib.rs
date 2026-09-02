pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod presentation;

use presentation::commands::{
    get_siteblock_status, install_siteblock_service, save_siteblock_config,
    start_privileged_session,
};
use presentation::menu::{build_app_menu, handle_menu_event};
pub use presentation::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .menu(build_app_menu)
        .on_menu_event(handle_menu_event)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            log::info!("Segunda instância detectada: restaurando janela principal.");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            let tray_controller = crate::presentation::tray::setup_tray(app.handle())?;
            let state = app.state::<AppState>();
            if let Ok(initial_status) = state.get_status_use_case.execute() {
                tray_controller.update_state(&initial_status);
            }
            app.manage(tray_controller);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_siteblock_status,
            start_privileged_session,
            save_siteblock_config,
            install_siteblock_service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

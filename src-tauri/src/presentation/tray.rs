use crate::domain::entities::SiteBlockState;
use crate::presentation::state::AppState;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Emitter, Manager, Wry,
};

pub const TRAY_ID: &str = "siteblock-tray";
pub const ITEM_STATUS: &str = "tray_status";
pub const ITEM_TOGGLE: &str = "tray_toggle";
pub const ITEM_OPEN: &str = "tray_open";
pub const ITEM_QUIT: &str = "tray_quit";
pub const STATE_CHANGED_EVENT: &str = "siteblock://state-changed";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TrayStateView {
    Normal(SiteBlockState),
    Busy,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrayViewModel {
    pub status_text: String,
    pub action_text: String,
    pub action_enabled: bool,
    pub tooltip: String,
}

impl TrayViewModel {
    pub fn from_state_view(
        view: &TrayStateView,
        last_known_state: Option<&SiteBlockState>,
    ) -> Self {
        match view {
            TrayStateView::Busy => Self {
                status_text: "Processando…".to_string(),
                action_text: "Processando…".to_string(),
                action_enabled: false,
                tooltip: "SiteBlock — Processando…".to_string(),
            },
            TrayStateView::Error => {
                let action_text = if last_known_state.map_or(false, |s| s.enabled) {
                    "Desativar bloqueio".to_string()
                } else {
                    "Ativar bloqueio".to_string()
                };
                Self {
                    status_text: "Status indisponível — abra o painel".to_string(),
                    action_text,
                    action_enabled: false,
                    tooltip: "SiteBlock — Status indisponível — abra o painel".to_string(),
                }
            }
            TrayStateView::Normal(state) => {
                if !state.helper_installed {
                    Self {
                        status_text: "Integração necessária".to_string(),
                        action_text: "Ativar bloqueio".to_string(),
                        action_enabled: false,
                        tooltip: "SiteBlock — Integração necessária".to_string(),
                    }
                } else if !state.enabled {
                    Self {
                        status_text: "Bloqueio desativado".to_string(),
                        action_text: "Ativar bloqueio".to_string(),
                        action_enabled: true,
                        tooltip: "SiteBlock — Bloqueio desativado".to_string(),
                    }
                } else if state.active {
                    let active_names: Vec<&str> = state
                        .profiles
                        .iter()
                        .filter(|p| state.active_profile_ids.contains(&p.id))
                        .map(|p| p.name.as_str())
                        .collect();

                    let detail = if !active_names.is_empty() {
                        format!(" ({})", active_names.join(", "))
                    } else {
                        String::new()
                    };

                    let status_text = format!("Proteção ativa{}", detail);
                    Self {
                        status_text: status_text.clone(),
                        action_text: "Desativar bloqueio".to_string(),
                        action_enabled: true,
                        tooltip: format!("SiteBlock — {}", status_text),
                    }
                } else {
                    Self {
                        status_text: "Habilitado — fora do horário".to_string(),
                        action_text: "Desativar bloqueio".to_string(),
                        action_enabled: true,
                        tooltip: "SiteBlock — Habilitado — fora do horário".to_string(),
                    }
                }
            }
        }
    }
}

pub struct TrayController {
    status_item: MenuItem<Wry>,
    toggle_item: MenuItem<Wry>,
    tray_icon: TrayIcon<Wry>,
    last_known_state: Mutex<Option<SiteBlockState>>,
}

impl TrayController {
    pub fn new(
        status_item: MenuItem<Wry>,
        toggle_item: MenuItem<Wry>,
        tray_icon: TrayIcon<Wry>,
    ) -> Self {
        Self {
            status_item,
            toggle_item,
            tray_icon,
            last_known_state: Mutex::new(None),
        }
    }

    fn apply_view_model(&self, vm: &TrayViewModel) {
        let _ = self.status_item.set_text(&vm.status_text);
        let _ = self.status_item.set_enabled(false);
        let _ = self.toggle_item.set_text(&vm.action_text);
        let _ = self.toggle_item.set_enabled(vm.action_enabled);
        let _ = self.tray_icon.set_tooltip(Some(&vm.tooltip));
    }

    pub fn update_state(&self, state: &SiteBlockState) {
        let mut lock = self.last_known_state.lock().unwrap();
        *lock = Some(state.clone());
        let vm =
            TrayViewModel::from_state_view(&TrayStateView::Normal(state.clone()), lock.as_ref());
        self.apply_view_model(&vm);
    }

    pub fn set_busy(&self) {
        let lock = self.last_known_state.lock().unwrap();
        let vm = TrayViewModel::from_state_view(&TrayStateView::Busy, lock.as_ref());
        self.apply_view_model(&vm);
    }

    pub fn set_error(&self) {
        let lock = self.last_known_state.lock().unwrap();
        let vm = TrayViewModel::from_state_view(&TrayStateView::Error, lock.as_ref());
        self.apply_view_model(&vm);
    }
}

pub fn setup_tray(app: &AppHandle) -> Result<TrayController, Box<dyn std::error::Error>> {
    let initial_vm =
        TrayViewModel::from_state_view(&TrayStateView::Normal(SiteBlockState::empty()), None);

    let status_item = MenuItem::with_id(
        app,
        ITEM_STATUS,
        &initial_vm.status_text,
        false,
        None::<&str>,
    )?;
    let toggle_item = MenuItem::with_id(
        app,
        ITEM_TOGGLE,
        &initial_vm.action_text,
        initial_vm.action_enabled,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let open_item = MenuItem::with_id(app, ITEM_OPEN, "Abrir painel", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, ITEM_QUIT, "Sair", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &status_item,
            &toggle_item,
            &separator,
            &open_item,
            &quit_item,
        ],
    )?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("Ícone padrão da janela não encontrado.")?;

    let tray_icon = TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .tooltip(&initial_vm.tooltip)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                ITEM_OPEN => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                ITEM_QUIT => {
                    log::info!("Encerrando SiteBlock via menu da bandeja.");
                    app.exit(0);
                }
                ITEM_TOGGLE => {
                    let app_handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let state = app_handle.state::<AppState>();
                        let tray_controller = match app_handle.try_state::<TrayController>() {
                            Some(c) => c,
                            None => return,
                        };

                        if state.toggle_blocking_use_case.is_busy() {
                            log::warn!("Ação de alternância ignorada: operação já em andamento.");
                            return;
                        }

                        tray_controller.set_busy();

                        match state.toggle_blocking_use_case.execute() {
                            Ok(new_state) => {
                                tray_controller.update_state(&new_state);
                                if let Err(err) = app_handle.emit(STATE_CHANGED_EVENT, &new_state) {
                                    log::warn!("Falha ao emitir {STATE_CHANGED_EVENT}: {err}");
                                }
                            }
                            Err(err) => {
                                log::error!("Falha ao alternar bloqueio via tray: {err}. Abra o painel para mais detalhes.");
                                tray_controller.set_error();
                            }
                        }
                    });
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(TrayController::new(status_item, toggle_item, tray_icon))
}

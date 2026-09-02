use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Wry,
};

pub const ITEM_PREFERENCES: &str = "app_preferences";
pub const ITEM_ABOUT: &str = "app_about";
pub const ITEM_QUIT: &str = "app_quit";
pub const OPEN_PREFERENCES_EVENT: &str = "siteblock://open-preferences";
pub const OPEN_ABOUT_EVENT: &str = "siteblock://open-about";

pub fn build_app_menu(app: &AppHandle<Wry>) -> tauri::Result<Menu<Wry>> {
    let preferences = MenuItem::with_id(
        app,
        ITEM_PREFERENCES,
        "Preferências…",
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let quit = MenuItem::with_id(app, ITEM_QUIT, "Sair", true, Some("CmdOrCtrl+Q"))?;
    let file_menu = Submenu::with_items(
        app,
        "Arquivo",
        true,
        &[&preferences, &PredefinedMenuItem::separator(app)?, &quit],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Editar",
        true,
        &[
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let about = MenuItem::with_id(app, ITEM_ABOUT, "Sobre o SiteBlock", true, None::<&str>)?;
    let help_menu = Submenu::with_items(app, "Ajuda", true, &[&about])?;

    Menu::with_items(app, &[&file_menu, &edit_menu, &help_menu])
}

pub fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
    let result = match event.id().as_ref() {
        ITEM_PREFERENCES => app.emit(OPEN_PREFERENCES_EVENT, ()),
        ITEM_ABOUT => app.emit(OPEN_ABOUT_EVENT, ()),
        ITEM_QUIT => {
            log::info!("Encerrando SiteBlock pelo menu principal.");
            app.exit(0);
            return;
        }
        _ => return,
    };

    if let Err(error) = result {
        log::warn!("Falha ao encaminhar evento do menu principal: {error}");
    }
}

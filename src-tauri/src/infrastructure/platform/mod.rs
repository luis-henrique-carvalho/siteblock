#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "linux")]
pub use linux as imp;

#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "windows")]
pub use windows as imp;

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
compile_error!("Plataforma não suportada pelo SiteBlock. Suportadas atualmente: Linux, Windows.");

#[must_use]
pub fn build_schtasks_create_command(admin_exe_path: &str) -> Vec<String> {
    vec![
        "/create".into(),
        "/tn".into(),
        "SiteBlockReconcile".into(),
        "/tr".into(),
        format!("\"{}\" reconcile", admin_exe_path),
        "/sc".into(),
        "minute".into(),
        "/mo".into(),
        "1".into(),
        "/ru".into(),
        "SYSTEM".into(),
        "/f".into(),
    ]
}

#[must_use]
pub fn build_schtasks_delete_command() -> Vec<String> {
    vec![
        "/delete".into(),
        "/tn".into(),
        "SiteBlockReconcile".into(),
        "/f".into(),
    ]
}

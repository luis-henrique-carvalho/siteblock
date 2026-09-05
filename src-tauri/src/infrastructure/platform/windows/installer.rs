use std::process::{Child, Command, Stdio};

use crate::domain::errors::{AppError, AppResult};
use crate::infrastructure::platform::{
    build_schtasks_create_command,
};

pub fn run_installer() -> AppResult<Child> {
    let admin_path = crate::infrastructure::paths::admin_binary_path();
    let schtasks_args = build_schtasks_create_command(&admin_path.to_string_lossy());

    let status = Command::new("schtasks")
        .args(&schtasks_args)
        .status()
        .map_err(|err| {
            AppError::InstallationFailed(format!("Falha ao registrar schtasks: {err}"))
        })?;

    if !status.success() {
        log::warn!(
            "schtasks retornou código de saída diferente de zero: {:?}",
            status.code()
        );
    }

    Command::new(&admin_path)
        .arg("session")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| {
            AppError::InstallationFailed(format!("Falha ao iniciar siteblock-admin: {err}"))
        })
}

use std::{
    fs,
    process::{Child, Command, Stdio},
    time::{SystemTime, UNIX_EPOCH},
};

use crate::domain::errors::{AppError, AppResult};
use super::assets;

pub fn run_installer() -> AppResult<Child> {
    log::info!("Iniciando preparação da instalação do serviço SiteBlock...");
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| AppError::Generic(err.to_string()))?
        .as_nanos();

    let directory =
        std::env::temp_dir().join(format!("siteblock-setup-{}-{nonce}", std::process::id()));
    fs::create_dir(&directory).map_err(|err| {
        AppError::InstallationFailed(format!(
            "Não foi possível preparar o diretório de instalação: {err}"
        ))
    })?;

    let setup_result = assets::extract_all_to(&directory);
    if let Err(err) = setup_result {
        log::error!("Falha ao extrair assets em {}: {err}", directory.display());
        let _ = fs::remove_dir_all(&directory);
        return Err(AppError::InstallationFailed(format!(
            "Falha ao extrair arquivos de instalação: {err}"
        )));
    }

    let install_script = directory.join("install");
    let spawn_result = Command::new("pkexec")
        .arg(&install_script)
        .arg(&directory)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| {
            log::warn!("Autorização negada ou erro ao iniciar instalador: {err}");
            AppError::AuthorizationDenied(format!(
                "Não foi possível pedir autorização para instalação: {err}"
            ))
        });

    match spawn_result {
        Ok(child) => {
            log::info!("Instalador iniciado com sucesso (PID: {})", child.id());
            Ok(child)
        }
        Err(err) => {
            let _ = fs::remove_dir_all(&directory);
            Err(err)
        }
    }
}

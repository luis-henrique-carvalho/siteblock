use std::{
    fs,
    path::PathBuf,
    process::{Child, Command, Stdio},
    time::{SystemTime, UNIX_EPOCH},
};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::ports::InstallerPort;
use crate::infrastructure::embedded_assets;

pub struct SystemInstaller;

impl SystemInstaller {
    pub fn new() -> Self {
        Self
    }

    fn create_temp_setup_dir() -> AppResult<PathBuf> {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|err| AppError::Generic(err.to_string()))?
            .as_nanos();

        let directory = std::env::temp_dir().join(format!("siteblock-setup-{}-{nonce}", std::process::id()));
        fs::create_dir(&directory)
            .map_err(|err| AppError::InstallationFailed(format!("Não foi possível preparar o diretório de instalação: {err}")))?;

        Ok(directory)
    }
}

impl Default for SystemInstaller {
    fn default() -> Self {
        Self::new()
    }
}

impl InstallerPort for SystemInstaller {
    fn prepare_and_install(&self) -> AppResult<Child> {
        let directory = Self::create_temp_setup_dir()?;

        let setup_result = embedded_assets::extract_all_to(&directory);
        if let Err(err) = setup_result {
            let _ = fs::remove_dir_all(&directory);
            return Err(AppError::InstallationFailed(format!("Falha ao extrair arquivos de instalação: {err}")));
        }

        let install_script = directory.join("install");
        let spawn_result = Command::new("pkexec")
            .arg(&install_script)
            .arg(&directory)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|err| AppError::AuthorizationDenied(format!("Não foi possível pedir autorização para instalação: {err}")));

        // Directory cleanup will happen when installer script finishes running or we clean it up
        match spawn_result {
            Ok(child) => Ok(child),
            Err(err) => {
                let _ = fs::remove_dir_all(&directory);
                Err(err)
            }
        }
    }
}

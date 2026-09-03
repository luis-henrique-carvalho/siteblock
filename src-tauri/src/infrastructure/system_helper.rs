use crate::domain::errors::{AppError, AppResult};
use crate::domain::ports::HelperPort;
use crate::infrastructure::embedded_assets::HELPER_PATH;
use std::path::Path;
use std::process::Command;

pub struct SystemHelper {
    helper_path: String,
}

impl SystemHelper {
    pub fn new() -> Self {
        Self {
            helper_path: HELPER_PATH.to_string(),
        }
    }

    pub fn with_path(path: impl Into<String>) -> Self {
        Self {
            helper_path: path.into(),
        }
    }

    fn run_command(&self, args: &[&str]) -> AppResult<String> {
        log::debug!(
            "Executando helper '{}' com args: {:?}",
            self.helper_path,
            args
        );
        let output = Command::new(&self.helper_path)
            .args(args)
            .output()
            .map_err(|err| {
                log::error!(
                    "Falha de I/O ao executar helper '{}': {err}",
                    self.helper_path
                );
                AppError::IoError(format!(
                    "Falha ao executar helper '{}': {err}",
                    self.helper_path
                ))
            })?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            log::warn!(
                "Helper '{}' retornou código não-zero: {stderr}",
                self.helper_path
            );
            Err(AppError::Generic(stderr))
        }
    }
}

impl Default for SystemHelper {
    fn default() -> Self {
        Self::new()
    }
}

impl HelperPort for SystemHelper {
    fn is_installed(&self) -> bool {
        Path::new(&self.helper_path).is_file()
    }

    fn supports_session(&self) -> bool {
        self.run_command(&["capabilities"])
            .ok()
            .and_then(|val| serde_json::from_str::<serde_json::Value>(&val).ok())
            .is_some_and(|val| {
                val.get("session")
                    .and_then(serde_json::Value::as_bool)
                    .unwrap_or(false)
                    && val
                        .get("browserIntegration")
                        .and_then(serde_json::Value::as_bool)
                        .unwrap_or(false)
                    && val
                        .get("integrationVersion")
                        .and_then(serde_json::Value::as_u64)
                        .unwrap_or_default()
                        >= 3
            })
    }

    fn get_status_raw(&self) -> AppResult<String> {
        self.run_command(&["status"])
    }
}

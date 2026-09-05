use std::process::Child;

use crate::domain::errors::AppResult;
use crate::domain::ports::InstallerPort;

pub use crate::infrastructure::platform::{
    build_schtasks_create_command, build_schtasks_delete_command,
};

pub struct SystemInstaller;

impl SystemInstaller {
    #[must_use]
    pub fn new() -> Self {
        Self
    }
}

impl Default for SystemInstaller {
    fn default() -> Self {
        Self::new()
    }
}

impl InstallerPort for SystemInstaller {
    fn prepare_and_install(&self) -> AppResult<Child> {
        crate::infrastructure::platform::imp::run_installer()
    }
}

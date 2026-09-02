use std::process::Child;
use crate::domain::entities::SiteBlockState;
use crate::domain::errors::AppResult;

pub trait HelperPort: Send + Sync {
    fn is_installed(&self) -> bool;
    fn supports_session(&self) -> bool;
    fn get_status_raw(&self) -> AppResult<String>;
}

pub trait SessionPort: Send + Sync {
    fn send_request(&self, request: serde_json::Value) -> AppResult<SiteBlockState>;
    fn adopt_child(&self, child: Child) -> AppResult<()>;
}

pub trait InstallerPort: Send + Sync {
    fn prepare_and_install(&self) -> AppResult<Child>;
}

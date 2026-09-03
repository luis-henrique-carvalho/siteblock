use crate::domain::entities::{FocusStatistics, FocusStatisticsQuery, SiteBlockState};
use crate::domain::errors::{AppError, AppResult};
use std::process::Child;

pub trait HelperPort: Send + Sync {
    fn is_installed(&self) -> bool;
    fn supports_session(&self) -> bool;
    fn get_status_raw(&self) -> AppResult<String>;
}

pub trait SessionPort: Send + Sync {
    fn send_request(&self, request: serde_json::Value) -> AppResult<SiteBlockState>;
    fn send_focus_statistics(&self, _query: FocusStatisticsQuery) -> AppResult<FocusStatistics> {
        Err(AppError::Generic(
            "A sessão administrativa não suporta estatísticas de foco.".into(),
        ))
    }
    fn adopt_child(&self, child: Child) -> AppResult<()>;
}

pub trait InstallerPort: Send + Sync {
    fn prepare_and_install(&self) -> AppResult<Child>;
}

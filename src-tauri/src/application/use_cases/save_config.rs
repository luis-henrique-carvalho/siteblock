use crate::domain::entities::{SiteBlockConfig, SiteBlockState};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::ports::SessionPort;
use serde_json::json;
use std::sync::Arc;

pub struct SaveConfigUseCase {
    session: Arc<dyn SessionPort>,
}

impl SaveConfigUseCase {
    pub fn new(session: Arc<dyn SessionPort>) -> Self {
        Self { session }
    }

    pub fn execute(&self, config: SiteBlockConfig) -> AppResult<SiteBlockState> {
        config.validate().map_err(AppError::ValidationError)?;

        self.session.send_request(json!({
            "action": "set-config",
            "config": config
        }))
    }
}

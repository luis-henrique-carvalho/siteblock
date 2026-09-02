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

    pub fn execute(&self, mut config: SiteBlockConfig) -> AppResult<SiteBlockState> {
        config.ensure_migrated();
        config.validate().map_err(AppError::ValidationError)?;

        let mut state = self.session.send_request(json!({
            "action": "set-config",
            "config": config
        }))?;

        if state.profiles.is_empty() && !config.profiles.is_empty() {
            let now = chrono::Local::now();
            state.profiles = config.profiles.clone();
            state.active_profile_ids = crate::infrastructure::system_core::get_active_profiles(&config, now)
                .into_iter()
                .map(|p| p.id.clone())
                .collect();
            state.effective_domains = crate::infrastructure::system_core::effective_blocked_domains(&config, now);
            state.helper_outdated = true;
        } else {
            state.ensure_migrated();
        }

        Ok(state)
    }
}

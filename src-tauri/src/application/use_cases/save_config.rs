use crate::domain::entities::{SiteBlockConfig, SiteBlockState};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::ports::SessionPort;
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

        let mut state = self.session.set_config(&config)?;

        if state.profiles.is_empty() && !config.profiles.is_empty() {
            let now = chrono::Local::now();
            state.profiles.clone_from(&config.profiles);
            state.active_profile_ids = config
                .active_profiles(now)
                .into_iter()
                .map(|p| p.id.clone())
                .collect();
            state.effective_domains = config.effective_blocked_domains(now);
            state.helper_outdated = true;
        } else {
            state.ensure_migrated();
        }

        Ok(state)
    }
}

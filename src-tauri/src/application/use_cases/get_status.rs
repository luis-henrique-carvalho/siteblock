use crate::domain::entities::SiteBlockState;
use crate::domain::errors::{AppError, AppResult};
use crate::domain::ports::HelperPort;
use std::sync::Arc;

pub struct GetStatusUseCase {
    helper: Arc<dyn HelperPort>,
}

impl GetStatusUseCase {
    pub fn new(helper: Arc<dyn HelperPort>) -> Self {
        Self { helper }
    }

    pub fn execute(&self) -> AppResult<SiteBlockState> {
        if !self.helper.is_installed() {
            return Ok(SiteBlockState::empty());
        }

        let raw_status = self.helper.get_status_raw()?;
        let mut state: SiteBlockState = serde_json::from_str(&raw_status).map_err(|err| {
            AppError::InvalidResponse(format!("Falha ao decodificar status: {err}"))
        })?;

        state.session_supported = self.helper.supports_session();
        Ok(state)
    }
}

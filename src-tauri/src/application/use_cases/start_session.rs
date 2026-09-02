use crate::domain::entities::SiteBlockState;
use crate::domain::errors::AppResult;
use crate::domain::ports::{HelperPort, SessionPort};
use serde_json::json;
use std::sync::Arc;

pub struct StartSessionUseCase {
    helper: Arc<dyn HelperPort>,
    session: Arc<dyn SessionPort>,
}

impl StartSessionUseCase {
    pub fn new(helper: Arc<dyn HelperPort>, session: Arc<dyn SessionPort>) -> Self {
        Self { helper, session }
    }

    pub fn execute(&self) -> AppResult<SiteBlockState> {
        if !self.helper.is_installed() {
            return Ok(SiteBlockState::empty());
        }

        let mut state = self.session.send_request(json!({ "action": "status" }))?;
        state.ensure_migrated();
        Ok(state)
    }
}

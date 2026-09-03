use crate::domain::entities::{FocusStatistics, FocusStatisticsQuery};
use crate::domain::errors::AppResult;
use crate::domain::ports::SessionPort;
use std::sync::Arc;

pub struct GetFocusStatisticsUseCase {
    session: Arc<dyn SessionPort>,
}

impl GetFocusStatisticsUseCase {
    pub fn new(session: Arc<dyn SessionPort>) -> Self {
        Self { session }
    }

    pub fn execute(&self, query: FocusStatisticsQuery) -> AppResult<FocusStatistics> {
        self.session.send_focus_statistics(query)
    }
}

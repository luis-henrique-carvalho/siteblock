use crate::application::use_cases::{SaveConfigUseCase, StartSessionUseCase};
use crate::domain::entities::{SiteBlockConfig, SiteBlockState};
use crate::domain::errors::{AppError, AppResult};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

pub struct ToggleBlockingUseCase {
    start_session_use_case: Arc<StartSessionUseCase>,
    save_config_use_case: Arc<SaveConfigUseCase>,
    is_busy: Arc<AtomicBool>,
}

struct BusyGuard(Arc<AtomicBool>);

impl Drop for BusyGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

impl ToggleBlockingUseCase {
    pub fn new(
        start_session_use_case: Arc<StartSessionUseCase>,
        save_config_use_case: Arc<SaveConfigUseCase>,
    ) -> Self {
        Self {
            start_session_use_case,
            save_config_use_case,
            is_busy: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn with_busy_flag(
        start_session_use_case: Arc<StartSessionUseCase>,
        save_config_use_case: Arc<SaveConfigUseCase>,
        is_busy: Arc<AtomicBool>,
    ) -> Self {
        Self {
            start_session_use_case,
            save_config_use_case,
            is_busy,
        }
    }

    pub fn is_busy(&self) -> bool {
        self.is_busy.load(Ordering::SeqCst)
    }

    pub fn execute(&self) -> AppResult<SiteBlockState> {
        if self
            .is_busy
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err(AppError::Generic(
                "Operação de alternância de bloqueio já em andamento.".into(),
            ));
        }

        let _guard = BusyGuard(Arc::clone(&self.is_busy));

        let current_state = self.start_session_use_case.execute()?;

        if !current_state.helper_installed {
            return Err(AppError::Generic("Integração necessária".into()));
        }

        let next_enabled = !current_state.enabled;
        let mut new_config = if !current_state.profiles.is_empty() {
            SiteBlockConfig::new(next_enabled, current_state.profiles)
        } else {
            SiteBlockConfig::legacy(next_enabled, current_state.domains, current_state.schedules)
        };
        new_config.ensure_migrated();

        self.save_config_use_case.execute(new_config)
    }
}

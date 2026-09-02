use std::sync::Arc;
use crate::application::use_cases::{
    GetStatusUseCase, InstallServiceUseCase, SaveConfigUseCase, StartSessionUseCase,
    ToggleBlockingUseCase,
};
use crate::domain::ports::{HelperPort, InstallerPort, SessionPort};
use crate::infrastructure::{SystemHelper, SystemInstaller, SystemSession};

pub struct AppState {
    pub get_status_use_case: Arc<GetStatusUseCase>,
    pub start_session_use_case: Arc<StartSessionUseCase>,
    pub save_config_use_case: Arc<SaveConfigUseCase>,
    pub install_service_use_case: Arc<InstallServiceUseCase>,
    pub toggle_blocking_use_case: Arc<ToggleBlockingUseCase>,
}

impl AppState {
    pub fn new(
        helper: Arc<dyn HelperPort>,
        session: Arc<dyn SessionPort>,
        installer: Arc<dyn InstallerPort>,
    ) -> Self {
        let get_status_use_case = Arc::new(GetStatusUseCase::new(Arc::clone(&helper)));
        let start_session_use_case = Arc::new(StartSessionUseCase::new(Arc::clone(&helper), Arc::clone(&session)));
        let save_config_use_case = Arc::new(SaveConfigUseCase::new(Arc::clone(&session)));
        let install_service_use_case = Arc::new(InstallServiceUseCase::new(installer, session));
        let toggle_blocking_use_case = Arc::new(ToggleBlockingUseCase::new(
            Arc::clone(&start_session_use_case),
            Arc::clone(&save_config_use_case),
        ));

        Self {
            get_status_use_case,
            start_session_use_case,
            save_config_use_case,
            install_service_use_case,
            toggle_blocking_use_case,
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        let helper = Arc::new(SystemHelper::new());
        let session = Arc::new(SystemSession::new());
        let installer = Arc::new(SystemInstaller::new());

        Self::new(helper, session, installer)
    }
}

use std::sync::Arc;
use crate::application::use_cases::{
    GetStatusUseCase, InstallServiceUseCase, SaveConfigUseCase, StartSessionUseCase,
};
use crate::domain::ports::{HelperPort, InstallerPort, SessionPort};
use crate::infrastructure::{SystemHelper, SystemInstaller, SystemSession};

pub struct AppState {
    pub get_status_use_case: GetStatusUseCase,
    pub start_session_use_case: StartSessionUseCase,
    pub save_config_use_case: SaveConfigUseCase,
    pub install_service_use_case: InstallServiceUseCase,
}

impl AppState {
    pub fn new(
        helper: Arc<dyn HelperPort>,
        session: Arc<dyn SessionPort>,
        installer: Arc<dyn InstallerPort>,
    ) -> Self {
        Self {
            get_status_use_case: GetStatusUseCase::new(Arc::clone(&helper)),
            start_session_use_case: StartSessionUseCase::new(Arc::clone(&helper), Arc::clone(&session)),
            save_config_use_case: SaveConfigUseCase::new(Arc::clone(&session)),
            install_service_use_case: InstallServiceUseCase::new(installer, session),
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

use crate::domain::entities::SiteBlockState;
use crate::domain::errors::AppResult;
use crate::domain::ports::{InstallerPort, SessionPort};
use serde_json::json;
use std::sync::Arc;

pub struct InstallServiceUseCase {
    installer: Arc<dyn InstallerPort>,
    session: Arc<dyn SessionPort>,
}

impl InstallServiceUseCase {
    pub fn new(installer: Arc<dyn InstallerPort>, session: Arc<dyn SessionPort>) -> Self {
        Self { installer, session }
    }

    pub fn execute(&self) -> AppResult<SiteBlockState> {
        let child = self.installer.prepare_and_install()?;
        self.session.adopt_child(child)?;
        self.session.send_request(json!({ "action": "status" }))
    }
}

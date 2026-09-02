use siteblock_lib::domain::entities::SiteBlockState;
use siteblock_lib::domain::errors::{AppError, AppResult};
use siteblock_lib::domain::ports::{HelperPort, InstallerPort, SessionPort};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

pub struct MockHelperPort {
    pub installed: bool,
    pub session_supported: bool,
    pub status_raw: Result<String, AppError>,
}

impl MockHelperPort {
    pub fn new(
        installed: bool,
        session_supported: bool,
        status_raw: Result<String, AppError>,
    ) -> Self {
        Self {
            installed,
            session_supported,
            status_raw,
        }
    }
}

impl HelperPort for MockHelperPort {
    fn is_installed(&self) -> bool {
        self.installed
    }

    fn supports_session(&self) -> bool {
        self.session_supported
    }

    fn get_status_raw(&self) -> AppResult<String> {
        self.status_raw.clone()
    }
}

pub struct MockSessionPort {
    pub response: Result<SiteBlockState, AppError>,
    pub recorded_requests: Mutex<Vec<serde_json::Value>>,
    pub adopted_count: Mutex<usize>,
}

impl MockSessionPort {
    pub fn new(response: Result<SiteBlockState, AppError>) -> Self {
        Self {
            response,
            recorded_requests: Mutex::new(Vec::new()),
            adopted_count: Mutex::new(0),
        }
    }

    pub fn last_request(&self) -> Option<serde_json::Value> {
        self.recorded_requests.lock().unwrap().last().cloned()
    }
}

impl SessionPort for MockSessionPort {
    fn send_request(&self, request: serde_json::Value) -> AppResult<SiteBlockState> {
        self.recorded_requests.lock().unwrap().push(request);
        self.response.clone()
    }

    fn adopt_child(&self, _child: Child) -> AppResult<()> {
        let mut count = self.adopted_count.lock().unwrap();
        *count += 1;
        Ok(())
    }
}

#[allow(dead_code)]
pub struct MockInstallerPort {
    pub should_fail: bool,
}

#[allow(dead_code)]
impl MockInstallerPort {
    pub fn success() -> Self {
        Self { should_fail: false }
    }

    pub fn failure() -> Self {
        Self { should_fail: true }
    }
}

impl InstallerPort for MockInstallerPort {
    fn prepare_and_install(&self) -> AppResult<Child> {
        if self.should_fail {
            return Err(AppError::AuthorizationDenied(
                "Permissão negada pelo usuário".into(),
            ));
        }

        // Spawn a dummy sleep/true process for test child handling
        let child = Command::new("true")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|err| AppError::IoError(err.to_string()))?;

        Ok(child)
    }
}

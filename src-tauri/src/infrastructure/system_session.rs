use std::{process::Child, sync::Mutex, time::Instant};

use crate::domain::entities::{FocusStatistics, FocusStatisticsQuery, SiteBlockState};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::ports::SessionPort;
use crate::infrastructure::platform::imp::PlatformSessionTransport;

pub struct SystemSession {
    inner: Mutex<PlatformSessionTransport>,
    helper_path: String,
}

impl SystemSession {
    pub fn new() -> Self {
        let path = crate::infrastructure::paths::admin_binary_path();
        Self {
            inner: Mutex::new(PlatformSessionTransport::default()),
            helper_path: path.to_string_lossy().to_string(),
        }
    }

    pub fn with_path(helper_path: impl Into<String>) -> Self {
        Self {
            inner: Mutex::new(PlatformSessionTransport::default()),
            helper_path: helper_path.into(),
        }
    }
}

impl Default for SystemSession {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemSession {
    fn send_value(&self, request: serde_json::Value) -> AppResult<serde_json::Value> {
        let action = request
            .get("action")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("unknown");
        log::debug!(
            "Enviando requisição para sessão privilegiada (action: {})",
            action
        );
        let start = Instant::now();

        let mut session = self.inner.lock().map_err(|_| {
            AppError::SessionUnavailable("Falha ao adquirir lock da sessão administrativa.".into())
        })?;

        session.ensure_started(&self.helper_path)?;
        let payload = format!("{}\n", serde_json::to_string(&request)?);
        let result = session.communicate(&payload);

        match result {
            Ok(response) => {
                let value: serde_json::Value = serde_json::from_str(&response).map_err(|err| {
                    log::error!("Resposta inválida do helper: {err}");
                    AppError::InvalidResponse(format!("Resposta inválida do serviço: {err}"))
                })?;

                if let Some(error_msg) = value.get("error").and_then(serde_json::Value::as_str) {
                    log::error!("Helper retornou erro para action {action}: {error_msg}");
                    return Err(AppError::Generic(error_msg.to_string()));
                }

                log::debug!(
                    "Requisição (action: {}) processada com sucesso em {:?}",
                    action,
                    start.elapsed()
                );
                Ok(value)
            }
            Err(err) => {
                log::warn!(
                    "Comunicação com a sessão privilegiada falhou ({:?}): {err}",
                    start.elapsed()
                );
                session.reset();
                Err(err)
            }
        }
    }
}

impl SessionPort for SystemSession {
    fn send_request(&self, request: serde_json::Value) -> AppResult<SiteBlockState> {
        let mut state: SiteBlockState =
            serde_json::from_value(self.send_value(request)?).map_err(|err| {
                log::error!("Estrutura de estado inválida retornada pelo helper: {err}");
                AppError::InvalidResponse(format!("Estrutura de estado inválida: {err}"))
            })?;
        state.session_supported = true;
        Ok(state)
    }

    fn send_focus_statistics(&self, query: FocusStatisticsQuery) -> AppResult<FocusStatistics> {
        serde_json::from_value(self.send_value(serde_json::json!({
            "action": "get-focus-statistics",
            "query": query,
        }))?)
        .map_err(|err| AppError::InvalidResponse(format!("Estatísticas inválidas: {err}")))
    }

    fn adopt_child(&self, child: Child) -> AppResult<()> {
        let mut session = self.inner.lock().map_err(|_| {
            AppError::SessionUnavailable("Falha ao adquirir lock da sessão administrativa.".into())
        })?;

        session.adopt(child)
    }
}

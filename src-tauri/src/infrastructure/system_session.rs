use std::{
    io::{BufRead, BufReader, Write},
    process::{Child, ChildStdin, ChildStdout, Command, Stdio},
    sync::Mutex,
};
use crate::domain::entities::SiteBlockState;
use crate::domain::errors::{AppError, AppResult};
use crate::domain::ports::SessionPort;
use crate::infrastructure::embedded_assets::HELPER_PATH;

#[derive(Default)]
struct PrivilegedSessionInner {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    stdout: Option<BufReader<ChildStdout>>,
}

impl PrivilegedSessionInner {
    fn reset(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
        }
        self.stdin = None;
        self.stdout = None;
    }

    fn ensure_started(&mut self, helper_path: &str) -> AppResult<()> {
        if let Some(child) = self.child.as_mut() {
            if child
                .try_wait()
                .map_err(|err| AppError::IoError(err.to_string()))?
                .is_none()
            {
                return Ok(());
            }
        }

        self.reset();

        let mut child = Command::new("pkexec")
            .args([helper_path, "session"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|err| AppError::AuthorizationDenied(format!("Não foi possível pedir autorização: {err}")))?;

        self.stdin = child.stdin.take();
        self.stdout = child.stdout.take().map(BufReader::new);
        self.child = Some(child);

        if self.stdin.is_none() || self.stdout.is_none() {
            self.reset();
            return Err(AppError::SessionUnavailable("Não foi possível iniciar os canais de comunicação da sessão administrativa.".into()));
        }

        Ok(())
    }

    fn adopt(&mut self, mut child: Child) -> AppResult<()> {
        self.reset();
        self.stdin = child.stdin.take();
        self.stdout = child.stdout.take().map(BufReader::new);
        self.child = Some(child);

        if self.stdin.is_none() || self.stdout.is_none() {
            self.reset();
            return Err(AppError::SessionUnavailable("Não foi possível adotar a sessão administrativa iniciada.".into()));
        }

        Ok(())
    }

    fn communicate(&mut self, payload: &str) -> AppResult<String> {
        let stdin = self.stdin.as_mut().ok_or_else(|| {
            AppError::SessionUnavailable("Canal de envio da sessão não está aberto.".into())
        })?;

        stdin.write_all(payload.as_bytes()).map_err(|err| {
            AppError::SessionUnavailable(format!("Falha ao escrever na sessão: {err}"))
        })?;

        stdin.flush().map_err(|err| {
            AppError::SessionUnavailable(format!("Falha ao descarregar buffer da sessão: {err}"))
        })?;

        let stdout = self.stdout.as_mut().ok_or_else(|| {
            AppError::SessionUnavailable("Canal de resposta da sessão não está aberto.".into())
        })?;

        let mut response = String::new();
        let bytes_read = stdout.read_line(&mut response).map_err(|err| {
            AppError::SessionUnavailable(format!("Falha ao ler resposta da sessão: {err}"))
        })?;

        if bytes_read == 0 {
            return Err(AppError::SessionUnavailable("A sessão administrativa foi encerrada.".into()));
        }

        Ok(response)
    }
}

pub struct SystemSession {
    inner: Mutex<PrivilegedSessionInner>,
    helper_path: String,
}

impl SystemSession {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(PrivilegedSessionInner::default()),
            helper_path: HELPER_PATH.to_string(),
        }
    }

    pub fn with_path(helper_path: impl Into<String>) -> Self {
        Self {
            inner: Mutex::new(PrivilegedSessionInner::default()),
            helper_path: helper_path.into(),
        }
    }
}

impl Default for SystemSession {
    fn default() -> Self {
        Self::new()
    }
}

impl SessionPort for SystemSession {
    fn send_request(&self, request: serde_json::Value) -> AppResult<SiteBlockState> {
        let mut session = self
            .inner
            .lock()
            .map_err(|_| AppError::SessionUnavailable("Falha ao adquirir lock da sessão administrativa.".into()))?;

        session.ensure_started(&self.helper_path)?;

        let payload = format!("{}\n", serde_json::to_string(&request)?);
        let result = session.communicate(&payload);

        match result {
            Ok(response) => {
                let value: serde_json::Value = serde_json::from_str(&response)
                    .map_err(|err| AppError::InvalidResponse(format!("Resposta inválida do serviço: {err}")))?;

                if let Some(error_msg) = value.get("error").and_then(serde_json::Value::as_str) {
                    return Err(AppError::Generic(error_msg.to_string()));
                }

                let mut state: SiteBlockState = serde_json::from_value(value)
                    .map_err(|err| AppError::InvalidResponse(format!("Estrutura de estado inválida: {err}")))?;

                state.session_supported = true;
                Ok(state)
            }
            Err(err) => {
                session.reset();
                Err(err)
            }
        }
    }

    fn adopt_child(&self, child: Child) -> AppResult<()> {
        let mut session = self
            .inner
            .lock()
            .map_err(|_| AppError::SessionUnavailable("Falha ao adquirir lock da sessão administrativa.".into()))?;

        session.adopt(child)
    }
}

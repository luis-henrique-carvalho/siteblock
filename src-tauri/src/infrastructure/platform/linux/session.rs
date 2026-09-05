use std::{
    io::{BufRead, BufReader, Write},
    process::{Child, ChildStdin, ChildStdout, Command, Stdio},
};

use crate::domain::errors::{AppError, AppResult};

#[derive(Default)]
pub struct PlatformSessionTransport {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    stdout: Option<BufReader<ChildStdout>>,
}

impl PlatformSessionTransport {
    pub fn reset(&mut self) {
        if let Some(mut child) = self.child.take() {
            log::info!(
                "Encerrando processo da sessão privilegiada existente (PID: {:?})",
                child.id()
            );
            let _ = child.kill();
        }
        self.stdin = None;
        self.stdout = None;
    }

    pub fn ensure_started(&mut self, helper_path: &str) -> AppResult<()> {
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
        log::info!(
            "Iniciando nova sessão privilegiada via pkexec com helper: {}",
            helper_path
        );

        let mut child = Command::new("pkexec")
            .args([helper_path, "session"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|err| {
                log::warn!("Falha ao pedir autorização pkexec: {err}");
                AppError::AuthorizationDenied(format!("Não foi possível pedir autorização: {err}"))
            })?;

        let pid = child.id();
        log::info!(
            "Processo privilegiado pkexec iniciado com sucesso (PID: {})",
            pid
        );

        self.stdin = child.stdin.take();
        self.stdout = child.stdout.take().map(BufReader::new);
        self.child = Some(child);

        if self.stdin.is_none() || self.stdout.is_none() {
            self.reset();
            log::error!(
                "Falha ao capturar stdin/stdout do processo pkexec (PID: {})",
                pid
            );
            return Err(AppError::SessionUnavailable(
                "Não foi possível iniciar os canais de comunicação da sessão administrativa."
                    .into(),
            ));
        }

        Ok(())
    }

    pub fn adopt(&mut self, mut child: Child) -> AppResult<()> {
        let pid = child.id();
        self.reset();
        self.stdin = child.stdin.take();
        self.stdout = child.stdout.take().map(BufReader::new);
        self.child = Some(child);

        if self.stdin.is_none() || self.stdout.is_none() {
            self.reset();
            log::error!("Falha ao adotar processo existente (PID: {})", pid);
            return Err(AppError::SessionUnavailable(
                "Não foi possível adotar a sessão administrativa iniciada.".into(),
            ));
        }
        log::info!("Processo privilegiado adotado com sucesso (PID: {})", pid);
        Ok(())
    }

    pub fn communicate(&mut self, payload: &str) -> AppResult<String> {
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
            log::warn!("Sessão administrativa retornou EOF (0 bytes lidos)");
            return Err(AppError::SessionUnavailable(
                "A sessão administrativa foi encerrada.".into(),
            ));
        }

        Ok(response)
    }
}

pub fn create_admin_stream(
    pipe_name: Option<&str>,
) -> std::io::Result<(Box<dyn BufRead>, Box<dyn Write>)> {
    if let Some(name) = pipe_name {
        eprintln!(
            "Aviso: Named pipes são exclusivos do Windows. Ignorando '{name}' no Linux e usando stdin/stdout."
        );
    }
    let stdin = std::io::stdin();
    let stdout = std::io::stdout();
    Ok((Box::new(BufReader::new(stdin)), Box::new(stdout)))
}

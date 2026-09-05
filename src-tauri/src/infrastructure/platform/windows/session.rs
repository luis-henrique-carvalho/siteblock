use std::{
    fs::File,
    io::{BufRead, BufReader, Write},
};

use crate::domain::errors::{AppError, AppResult};

#[derive(Default)]
pub struct PlatformSessionTransport {
    pipe_writer: Option<File>,
    pipe_reader: Option<BufReader<File>>,
}

impl PlatformSessionTransport {
    pub fn reset(&mut self) {
        self.pipe_writer = None;
        self.pipe_reader = None;
    }

    #[allow(unsafe_code)]
    pub fn ensure_started(&mut self, helper_path: &str) -> AppResult<()> {
        if self.pipe_writer.is_some() && self.pipe_reader.is_some() {
            return Ok(());
        }

        self.reset();

        use std::os::windows::io::FromRawHandle;
        use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
        use windows_sys::Win32::Storage::FileSystem::{
            FILE_FLAG_FIRST_PIPE_INSTANCE, PIPE_ACCESS_DUPLEX,
        };
        use windows_sys::Win32::System::Pipes::{
            ConnectNamedPipe, CreateNamedPipeW, PIPE_READMODE_BYTE, PIPE_TYPE_BYTE, PIPE_WAIT,
        };
        use windows_sys::Win32::UI::Shell::{
            ShellExecuteExW, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW,
        };
        use windows_sys::Win32::UI::WindowsAndMessaging::SW_HIDE;

        let pipe_name = format!("siteblock-session-{}", std::process::id());
        let full_pipe_path = format!(r"\\.\pipe\{}", pipe_name);
        let wide_pipe: Vec<u16> = full_pipe_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        log::info!("Criando Named Pipe server: {}", full_pipe_path);
        let pipe_handle = unsafe {
            CreateNamedPipeW(
                wide_pipe.as_ptr(),
                PIPE_ACCESS_DUPLEX | FILE_FLAG_FIRST_PIPE_INSTANCE,
                PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
                1,
                65536,
                65536,
                10000,
                std::ptr::null(),
            )
        };

        if pipe_handle == INVALID_HANDLE_VALUE {
            return Err(AppError::SessionUnavailable(
                "Falha ao criar Named Pipe para UAC".into(),
            ));
        }

        let verb: Vec<u16> = "runas\0".encode_utf16().collect();
        let file: Vec<u16> = helper_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let params_str = format!("session --pipe {}", pipe_name);
        let params: Vec<u16> = params_str
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let mut exec_info: SHELLEXECUTEINFOW = unsafe { std::mem::zeroed() };
        exec_info.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
        exec_info.fMask = SEE_MASK_NOCLOSEPROCESS;
        exec_info.lpVerb = verb.as_ptr();
        exec_info.lpFile = file.as_ptr();
        exec_info.lpParameters = params.as_ptr();
        exec_info.nShow = SW_HIDE as i32;

        log::info!("Disparando processo administrativo com elevação UAC (runas)...");
        let success = unsafe { ShellExecuteExW(&mut exec_info) };
        if success == 0 {
            unsafe { windows_sys::Win32::Foundation::CloseHandle(pipe_handle) };
            return Err(AppError::AuthorizationDenied(
                "Autorização UAC negada pelo usuário.".into(),
            ));
        }

        log::info!("Aguardando conexão do processo elevado no Named Pipe...");
        let connect_success = unsafe { ConnectNamedPipe(pipe_handle, std::ptr::null_mut()) };
        if connect_success == 0 {
            let err = unsafe { windows_sys::Win32::Foundation::GetLastError() };
            if err != 535 {
                unsafe { windows_sys::Win32::Foundation::CloseHandle(pipe_handle) };
                return Err(AppError::SessionUnavailable(format!(
                    "Falha ao conectar no Named Pipe (código {})",
                    err
                )));
            }
        }

        let file = unsafe { File::from_raw_handle(pipe_handle.cast()) };
        let writer = file.try_clone().map_err(|e| {
            AppError::SessionUnavailable(format!("Falha ao clonar descritor do pipe: {e}"))
        })?;
        let reader = BufReader::new(file);

        self.pipe_writer = Some(writer);
        self.pipe_reader = Some(reader);

        log::info!("Sessão administrativa conectada com sucesso via Named Pipe.");
        Ok(())
    }

    pub fn adopt(&mut self, _child: std::process::Child) -> AppResult<()> {
        Ok(())
    }

    pub fn communicate(&mut self, payload: &str) -> AppResult<String> {
        let writer = self.pipe_writer.as_mut().ok_or_else(|| {
            AppError::SessionUnavailable("Canal de envio da sessão não está aberto.".into())
        })?;

        writer.write_all(payload.as_bytes()).map_err(|err| {
            AppError::SessionUnavailable(format!("Falha ao escrever no pipe da sessão: {err}"))
        })?;

        writer.flush().map_err(|err| {
            AppError::SessionUnavailable(format!("Falha ao descarregar buffer do pipe: {err}"))
        })?;

        let reader = self.pipe_reader.as_mut().ok_or_else(|| {
            AppError::SessionUnavailable("Canal de resposta da sessão não está aberto.".into())
        })?;

        let mut response = String::new();
        let bytes_read = reader.read_line(&mut response).map_err(|err| {
            AppError::SessionUnavailable(format!("Falha ao ler resposta do pipe: {err}"))
        })?;

        if bytes_read == 0 {
            log::warn!("Sessão administrativa no pipe retornou EOF (0 bytes lidos)");
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
        let pipe_path = if name.starts_with(r"\\.\pipe\") {
            name.to_string()
        } else {
            format!(r"\\.\pipe\{}", name)
        };

        let pipe_file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .open(&pipe_path)?;

        let reader = BufReader::new(pipe_file.try_clone()?);
        let writer = pipe_file;
        Ok((Box::new(reader), Box::new(writer)))
    } else {
        let stdin = std::io::stdin();
        let stdout = std::io::stdout();
        Ok((Box::new(BufReader::new(stdin)), Box::new(stdout)))
    }
}

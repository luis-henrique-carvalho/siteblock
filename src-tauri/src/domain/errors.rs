use thiserror::Error;

#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum AppError {
    #[error("O helper de administração não está instalado no sistema.")]
    HelperNotInstalled,

    #[error("Autorização cancelada ou recusada: {0}")]
    AuthorizationDenied(String),

    #[error("A sessão administrativa está indisponível ou foi encerrada: {0}")]
    SessionUnavailable(String),

    #[error("Resposta inválida do serviço de administração: {0}")]
    InvalidResponse(String),

    #[error("Erro durante a instalação do serviço: {0}")]
    InstallationFailed(String),

    #[error("Dados de configuração inválidos: {0}")]
    ValidationError(String),

    #[error("Erro de I/O no sistema de arquivos: {0}")]
    IoError(String),

    #[error("Erro de serialização/deserialização: {0}")]
    SerializationError(String),

    #[error("{0}")]
    Generic(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err.to_string())
    }
}

impl From<String> for AppError {
    fn from(err: String) -> Self {
        AppError::Generic(err)
    }
}

impl From<&str> for AppError {
    fn from(err: &str) -> Self {
        AppError::Generic(err.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

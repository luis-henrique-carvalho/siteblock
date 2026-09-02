use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub id: String,
    pub days: Vec<u8>,
    pub start: String,
    pub end: String,
}

impl Schedule {
    pub fn new(
        id: impl Into<String>,
        days: Vec<u8>,
        start: impl Into<String>,
        end: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            days,
            start: start.into(),
            end: end.into(),
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.id.trim().is_empty() {
            return Err("O identificador do agendamento não pode ser vazio.".into());
        }

        for &day in &self.days {
            if day > 6 {
                return Err(format!(
                    "Dia da semana inválido ({day}). Deve ser entre 0 e 6."
                ));
            }
        }

        Self::validate_time(&self.start, "início")?;
        Self::validate_time(&self.end, "término")?;

        Ok(())
    }

    fn validate_time(time_str: &str, field_name: &str) -> Result<(), String> {
        let parts: Vec<&str> = time_str.split(':').collect();
        if parts.len() != 2 || parts[0].len() != 2 || parts[1].len() != 2 {
            return Err(format!(
                "Horário de {field_name} inválido: '{time_str}'. Use o formato HH:MM."
            ));
        }
        let hour: u32 = parts[0]
            .parse()
            .map_err(|_| format!("Hora de {field_name} inválida: '{}'.", parts[0]))?;
        let minute: u32 = parts[1]
            .parse()
            .map_err(|_| format!("Minuto de {field_name} inválido: '{}'.", parts[1]))?;

        if hour > 23 || minute > 59 {
            return Err(format!(
                "Horário de {field_name} fora do intervalo: '{time_str}'."
            ));
        }

        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteBlockConfig {
    pub enabled: bool,
    pub domains: Vec<String>,
    pub schedules: Vec<Schedule>,
}

impl SiteBlockConfig {
    pub fn new(enabled: bool, domains: Vec<String>, schedules: Vec<Schedule>) -> Self {
        Self {
            enabled,
            domains,
            schedules,
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        for domain in &self.domains {
            let trimmed = domain.trim();
            if trimmed.is_empty() {
                return Err("O domínio não pode ser vazio.".into());
            }
            if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains(' ') {
                return Err(format!("Formato de domínio inválido: '{domain}'. Informe apenas o nome do host (ex: exemplo.com)."));
            }
        }

        for schedule in &self.schedules {
            schedule.validate()?;
        }

        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserIntegration {
    pub name: String,
    pub detected: bool,
    pub policy_ready: bool,
    pub mode: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteBlockState {
    pub active: bool,
    pub enabled: bool,
    pub domains: Vec<String>,
    pub schedules: Vec<Schedule>,
    pub helper_installed: bool,
    #[serde(default)]
    pub session_supported: bool,
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub browser_integrations: Vec<BrowserIntegration>,
}

impl SiteBlockState {
    pub fn empty() -> Self {
        Self {
            active: false,
            enabled: false,
            domains: Vec::new(),
            schedules: Vec::new(),
            helper_installed: false,
            session_supported: false,
            revision: 0,
            browser_integrations: Vec::new(),
        }
    }
}

impl Default for SiteBlockState {
    fn default() -> Self {
        Self::empty()
    }
}

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
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(default = "default_profile_icon")]
    pub icon: String,
    #[serde(default = "default_profile_color")]
    pub color: String,
    pub enabled: bool,
    pub domains: Vec<String>,
    pub schedules: Vec<Schedule>,
}

fn default_profile_icon() -> String {
    "shield".to_string()
}

fn default_profile_color() -> String {
    "blue".to_string()
}

impl Profile {
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        icon: impl Into<String>,
        color: impl Into<String>,
        enabled: bool,
        domains: Vec<String>,
        schedules: Vec<Schedule>,
    ) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            icon: icon.into(),
            color: color.into(),
            enabled,
            domains,
            schedules,
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.id.trim().is_empty() {
            return Err("O identificador do perfil não pode ser vazio.".into());
        }
        if self.name.trim().is_empty() {
            return Err("O nome do perfil não pode ser vazio.".into());
        }
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

    pub fn default_presets() -> Vec<Profile> {
        vec![
            Profile::new(
                "focus",
                "Foco",
                "target",
                "blue",
                true,
                vec![
                    "youtube.com".to_string(),
                    "instagram.com".to_string(),
                    "twitter.com".to_string(),
                    "reddit.com".to_string(),
                ],
                vec![Schedule::new("focus-work", vec![0, 1, 2, 3, 4], "09:00", "18:00")],
            ),
            Self::default_study(),
            Self::default_sleep(),
        ]
    }

    pub fn default_study() -> Profile {
        Profile::new(
            "study",
            "Estudo",
            "book",
            "emerald",
            false,
            vec![
                "tiktok.com".to_string(),
                "netflix.com".to_string(),
                "twitch.tv".to_string(),
                "discord.com".to_string(),
            ],
            vec![
                Schedule::new("study-morning", vec![0, 1, 2, 3, 4], "08:00", "12:00"),
                Schedule::new("study-afternoon", vec![0, 1, 2, 3, 4], "14:00", "18:00"),
            ],
        )
    }

    pub fn default_sleep() -> Profile {
        Profile::new(
            "sleep",
            "Sono",
            "moon",
            "indigo",
            false,
            vec![
                "youtube.com".to_string(),
                "netflix.com".to_string(),
                "twitch.tv".to_string(),
                "twitter.com".to_string(),
                "instagram.com".to_string(),
                "tiktok.com".to_string(),
                "reddit.com".to_string(),
            ],
            vec![Schedule::new("sleep-night", vec![0, 1, 2, 3, 4, 5, 6], "23:00", "07:00")],
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteBlockConfig {
    pub enabled: bool,
    #[serde(default)]
    pub profiles: Vec<Profile>,
    #[serde(default)]
    pub domains: Vec<String>,
    #[serde(default)]
    pub schedules: Vec<Schedule>,
}

impl SiteBlockConfig {
    pub fn new(enabled: bool, profiles: Vec<Profile>) -> Self {
        let mut cfg = Self {
            enabled,
            profiles,
            domains: Vec::new(),
            schedules: Vec::new(),
        };
        cfg.populate_legacy_fields();
        cfg
    }

    pub fn legacy(enabled: bool, domains: Vec<String>, schedules: Vec<Schedule>) -> Self {
        Self {
            enabled,
            profiles: Vec::new(),
            domains,
            schedules,
        }
    }

    pub fn populate_legacy_fields(&mut self) {
        if !self.profiles.is_empty() {
            let mut all_domains = Vec::new();
            for p in &self.profiles {
                for d in &p.domains {
                    if !all_domains.contains(d) {
                        all_domains.push(d.clone());
                    }
                }
            }
            self.domains = all_domains;
            self.schedules = self.profiles.iter().flat_map(|p| p.schedules.clone()).collect();
        }
    }

    pub fn ensure_migrated(&mut self) {
        if self.profiles.is_empty() {
            if !self.domains.is_empty() || !self.schedules.is_empty() {
                let mut focus_schedules = std::mem::take(&mut self.schedules);
                focus_schedules.retain(|s| {
                    s.id != "sleep-night" && s.id != "study-morning" && s.id != "study-afternoon"
                });

                let focus_profile = Profile::new(
                    "focus",
                    "Foco",
                    "target",
                    "blue",
                    true,
                    std::mem::take(&mut self.domains),
                    focus_schedules,
                );
                self.profiles = vec![
                    focus_profile,
                    Profile::default_study(),
                    Profile::default_sleep(),
                ];
            } else {
                self.profiles = Profile::default_presets();
            }
        }

        // Purgar duplicatas e regras de outros presets que tenham vazado para o perfil focus
        for profile in &mut self.profiles {
            if profile.id == "focus" {
                profile.schedules.retain(|s| {
                    s.id != "sleep-night" && s.id != "study-morning" && s.id != "study-afternoon"
                });
            }
            let mut seen_ids = std::collections::HashSet::new();
            profile.schedules.retain(|s| seen_ids.insert(s.id.clone()));
        }

        self.populate_legacy_fields();
    }

    pub fn validate(&self) -> Result<(), String> {
        for profile in &self.profiles {
            profile.validate()?;
        }
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
    #[serde(default)]
    pub profiles: Vec<Profile>,
    #[serde(default)]
    pub active_profile_ids: Vec<String>,
    #[serde(default)]
    pub effective_domains: Vec<String>,
    #[serde(default)]
    pub domains: Vec<String>,
    #[serde(default)]
    pub schedules: Vec<Schedule>,
    pub helper_installed: bool,
    #[serde(default)]
    pub session_supported: bool,
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub browser_integrations: Vec<BrowserIntegration>,
    #[serde(default)]
    pub helper_outdated: bool,
}

impl SiteBlockState {
    pub fn empty() -> Self {
        Self {
            active: false,
            enabled: false,
            profiles: Vec::new(),
            active_profile_ids: Vec::new(),
            effective_domains: Vec::new(),
            domains: Vec::new(),
            schedules: Vec::new(),
            helper_installed: false,
            session_supported: false,
            revision: 0,
            browser_integrations: Vec::new(),
            helper_outdated: false,
        }
    }

    pub fn ensure_migrated(&mut self) {
        if self.profiles.is_empty() {
            if !self.domains.is_empty() || !self.schedules.is_empty() {
                let mut focus_schedules = self.schedules.clone();
                focus_schedules.retain(|s| {
                    s.id != "sleep-night" && s.id != "study-morning" && s.id != "study-afternoon"
                });

                let focus_profile = Profile::new(
                    "focus",
                    "Foco",
                    "target",
                    "blue",
                    true,
                    self.domains.clone(),
                    focus_schedules,
                );
                self.profiles = vec![
                    focus_profile,
                    Profile::default_study(),
                    Profile::default_sleep(),
                ];
            } else {
                self.profiles = Profile::default_presets();
            }
        }

        // Purgar duplicatas e regras de outros presets que tenham vazado para o perfil focus
        for profile in &mut self.profiles {
            if profile.id == "focus" {
                profile.schedules.retain(|s| {
                    s.id != "sleep-night" && s.id != "study-morning" && s.id != "study-afternoon"
                });
            }
            let mut seen_ids = std::collections::HashSet::new();
            profile.schedules.retain(|s| seen_ids.insert(s.id.clone()));
        }

        if self.active && self.active_profile_ids.is_empty() {
            self.active_profile_ids = vec!["focus".to_string()];
        }
        if self.effective_domains.is_empty() {
            self.effective_domains = self.domains.clone();
        }
    }
}

impl Default for SiteBlockState {
    fn default() -> Self {
        Self::empty()
    }
}


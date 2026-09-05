use std::{
    collections::HashMap,
    path::PathBuf,
    process::{Command, Stdio},
};

use crate::domain::entities::SiteBlockConfig;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BrowserEngine {
    ChromiumRegistry {
        registry_key_path: &'static str,
    },
    GeckoRegistry {
        registry_key_path: &'static str,
    },
}

#[derive(Debug, Clone, Copy)]
pub struct BrowserSpec {
    pub name: &'static str,
    pub engine: BrowserEngine,
    pub binaries: &'static [&'static str],
    pub requires_restart: bool,
    pub supports_hot_reload: bool,
}

pub const BROWSER_SPECS: &[BrowserSpec] = &[
    BrowserSpec {
        name: "Edge",
        engine: BrowserEngine::ChromiumRegistry {
            registry_key_path: r"SOFTWARE\Policies\Microsoft\Edge\URLBlocklist",
        },
        binaries: &["msedge.exe", "msedge"],
        requires_restart: false,
        supports_hot_reload: true,
    },
    BrowserSpec {
        name: "Chrome",
        engine: BrowserEngine::ChromiumRegistry {
            registry_key_path: r"SOFTWARE\Policies\Google\Chrome\URLBlocklist",
        },
        binaries: &["chrome.exe", "chrome"],
        requires_restart: false,
        supports_hot_reload: true,
    },
    BrowserSpec {
        name: "Brave",
        engine: BrowserEngine::ChromiumRegistry {
            registry_key_path: r"SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist",
        },
        binaries: &["brave.exe", "brave"],
        requires_restart: false,
        supports_hot_reload: true,
    },
    BrowserSpec {
        name: "Firefox",
        engine: BrowserEngine::GeckoRegistry {
            registry_key_path: r"SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Block",
        },
        binaries: &["firefox.exe", "firefox"],
        requires_restart: true,
        supports_hot_reload: false,
    },
];

impl BrowserSpec {
    pub fn is_detected(&self) -> bool {
        if find_command(self.binaries).is_some() {
            return true;
        }
        is_browser_detected_windows(self.name, self.binaries)
    }

    pub fn is_policy_present(&self) -> bool {
        match self.engine {
            BrowserEngine::ChromiumRegistry { registry_key_path }
            | BrowserEngine::GeckoRegistry { registry_key_path } => {
                is_registry_key_present(registry_key_path)
            }
        }
    }

    pub fn apply(&self, config: &SiteBlockConfig, enabled: bool) -> bool {
        let is_browser_enabled = enabled && config.enabled_browsers.iter().any(|b| b == self.name);

        match self.engine {
            BrowserEngine::ChromiumRegistry { registry_key_path } => {
                if is_browser_enabled {
                    let filters = config.blocked_hosts();
                    write_registry_url_blocklist(registry_key_path, &filters).is_ok()
                } else {
                    let _ = remove_registry_url_blocklist(registry_key_path);
                    false
                }
            }
            BrowserEngine::GeckoRegistry { registry_key_path } => {
                if is_browser_enabled {
                    let filters = config.blocked_url_filters(true);
                    write_registry_url_blocklist(registry_key_path, &filters).is_ok()
                } else {
                    let _ = remove_registry_url_blocklist(registry_key_path);
                    false
                }
            }
        }
    }

    pub fn reload(&self) {
        if self.supports_hot_reload {
            if let Some(bin_path) = find_command(self.binaries) {
                log::info!(
                    target: "siteblock::policy",
                    "[Policy] Disparando reload nativo de políticas para {}: {} --refresh-platform-policy",
                    self.name,
                    bin_path.display()
                );
                let _ = Command::new(&bin_path)
                    .arg("--refresh-platform-policy")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status();
            }
        }
    }
}

pub fn write_chromium_policies(
    filters: &[String],
    enabled_browsers: &[String],
) -> HashMap<String, bool> {
    let mut results = HashMap::new();
    for spec in BROWSER_SPECS {
        if let BrowserEngine::ChromiumRegistry { registry_key_path } = spec.engine {
            let enabled = enabled_browsers.iter().any(|b| b == spec.name);
            let success = if enabled {
                write_registry_url_blocklist(registry_key_path, filters).is_ok()
            } else {
                let _ = remove_registry_url_blocklist(registry_key_path);
                false
            };
            results.insert(spec.name.to_string(), success);
        }
    }
    results
}

pub fn write_registry_url_blocklist(key_path: &str, filters: &[String]) -> std::io::Result<()> {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let (key, _) = hklm.create_subkey(key_path)?;

    // Tag as managed by SiteBlock
    let _ = key.set_value("SiteBlockManaged", &1u32);

    let entries = crate::infrastructure::browser_policy::build_registry_blocklist_entries(filters);
    for (name, val) in entries {
        key.set_value(&name, &val)?;
    }
    Ok(())
}

pub fn remove_registry_url_blocklist(key_path: &str) -> std::io::Result<()> {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE};
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey_with_flags(key_path, KEY_READ | KEY_WRITE) {
        let is_managed: Result<u32, _> = key.get_value("SiteBlockManaged");
        if is_managed.unwrap_or(0) == 1 {
            drop(key);
            if let Some((parent_path, subkey_name)) = key_path.rsplit_once('\\') {
                if let Ok(parent) = hklm.open_subkey_with_flags(parent_path, KEY_WRITE) {
                    let _ = parent.delete_subkey_all(subkey_name);
                }
            }
        }
    }
    Ok(())
}

pub fn is_registry_key_present(key_path: &str) -> bool {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    hklm.open_subkey(key_path).is_ok()
}

fn is_browser_detected_windows(name: &str, binaries: &[&str]) -> bool {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    for bin in binaries {
        let app_path_key = format!(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{}", bin);
        if hklm.open_subkey(&app_path_key).is_ok() {
            return true;
        }
    }

    let program_files = std::env::var_os("ProgramFiles")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(r"C:\Program Files"));
    let program_files_x86 = std::env::var_os("ProgramFiles(x86)")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(r"C:\Program Files (x86)"));

    let check_dirs = [&program_files, &program_files_x86];
    for dir in &check_dirs {
        let relative_path = match name {
            "Edge" => Some(r"Microsoft\Edge\Application\msedge.exe"),
            "Chrome" => Some(r"Google\Chrome\Application\chrome.exe"),
            "Brave" => Some(r"BraveSoftware\Brave-Browser\Application\brave.exe"),
            "Firefox" => Some(r"Mozilla Firefox\firefox.exe"),
            _ => None,
        };
        if let Some(rel) = relative_path {
            if dir.join(rel).is_file() {
                return true;
            }
        }
    }
    false
}

fn find_command(names: &[&str]) -> Option<PathBuf> {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(';') {
            for name in names {
                let full = std::path::Path::new(dir).join(name);
                if full.is_file() {
                    return Some(full);
                }
            }
        }
    }
    None
}

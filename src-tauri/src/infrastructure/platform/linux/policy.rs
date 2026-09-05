use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

use crate::domain::entities::SiteBlockConfig;
use crate::infrastructure::hosts::atomic_write;

pub const FIREFOX_OWNERSHIP_PATH: &str = "/etc/siteblock/firefox-policy.sha256";
pub const FIREFOX_POLICY_PATH: &str = "/etc/firefox/policies/policies.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BrowserEngine {
    Chromium {
        managed_policy_path: &'static str,
    },
    Gecko {
        policy_path: &'static str,
        ownership_path: &'static str,
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
        name: "Chrome",
        engine: BrowserEngine::Chromium {
            managed_policy_path: "/etc/opt/chrome/policies/managed/com.luis.siteblock.json",
        },
        binaries: &["google-chrome", "google-chrome-stable"],
        requires_restart: false,
        supports_hot_reload: true,
    },
    BrowserSpec {
        name: "Brave",
        engine: BrowserEngine::Chromium {
            managed_policy_path: "/etc/brave/policies/managed/com.luis.siteblock.json",
        },
        binaries: &["brave-browser", "brave"],
        requires_restart: false,
        supports_hot_reload: true,
    },
    BrowserSpec {
        name: "Firefox",
        engine: BrowserEngine::Gecko {
            policy_path: FIREFOX_POLICY_PATH,
            ownership_path: FIREFOX_OWNERSHIP_PATH,
        },
        binaries: &["firefox"],
        requires_restart: true,
        supports_hot_reload: false,
    },
];

impl BrowserSpec {
    pub fn is_detected(&self) -> bool {
        find_command(self.binaries).is_some()
    }

    pub fn is_policy_present(&self) -> bool {
        match self.engine {
            BrowserEngine::Chromium {
                managed_policy_path,
            } => Path::new(managed_policy_path).exists(),
            BrowserEngine::Gecko {
                policy_path,
                ownership_path,
            } => Path::new(policy_path).exists() && Path::new(ownership_path).exists(),
        }
    }

    pub fn apply(&self, config: &SiteBlockConfig, enabled: bool) -> bool {
        let is_browser_enabled = enabled && config.enabled_browsers.iter().any(|b| b == self.name);

        match self.engine {
            BrowserEngine::Chromium {
                managed_policy_path,
            } => {
                let path = Path::new(managed_policy_path);
                if is_browser_enabled {
                    let filters = config.blocked_hosts();
                    let content = crate::infrastructure::browser_policy::build_chromium_policy_content(&filters);
                    atomic_write(path, content.as_bytes(), 0o644).is_ok()
                } else {
                    let _ = fs::remove_file(path);
                    false
                }
            }
            BrowserEngine::Gecko { .. } => {
                if is_browser_enabled {
                    let filters = config.blocked_url_filters(true);
                    crate::infrastructure::browser_policy::write_firefox_policy(&filters)
                } else {
                    crate::infrastructure::browser_policy::remove_firefox_policy();
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
    let content = crate::infrastructure::browser_policy::build_chromium_policy_content(filters);

    for spec in BROWSER_SPECS {
        if let BrowserEngine::Chromium {
            managed_policy_path,
        } = spec.engine
        {
            let enabled = enabled_browsers.iter().any(|browser| browser == spec.name);
            let path = Path::new(managed_policy_path);
            let success = if enabled {
                atomic_write(path, content.as_bytes(), 0o644).is_ok()
            } else {
                let _ = fs::remove_file(path);
                false
            };
            results.insert(spec.name.to_string(), success);
        }
    }
    results
}

fn find_command(names: &[&str]) -> Option<PathBuf> {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(':') {
            for name in names {
                let full = Path::new(dir).join(name);
                if full.is_file() {
                    return Some(full);
                }
            }
        }
    }
    None
}

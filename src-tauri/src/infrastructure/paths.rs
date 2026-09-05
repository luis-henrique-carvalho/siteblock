use std::env;
use std::path::PathBuf;

pub const UNIX_HOSTS_PATH: &str = "/etc/hosts";
pub const UNIX_CONFIG_PATH: &str = "/etc/siteblock/config.json";
pub const UNIX_RUNTIME_DIR: &str = "/var/lib/siteblock";
pub const UNIX_FOCUS_STATS_DIR: &str = "/var/lib/siteblock/focus";
pub const UNIX_AUDIT_LOG_PATH: &str = "/var/log/siteblock-admin.log";
pub const UNIX_ADMIN_BINARY_PATH: &str = "/usr/local/lib/siteblock/siteblock-admin";

pub fn resolve_windows_hosts_path(sysroot_override: Option<&str>) -> PathBuf {
    let sysroot = sysroot_override
        .map(PathBuf::from)
        .or_else(|| env::var_os("SystemRoot").map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from(r"C:\Windows"));
    sysroot.join("System32").join("drivers").join("etc").join("hosts")
}

pub fn resolve_windows_config_path(program_data_override: Option<&str>) -> PathBuf {
    let program_data = program_data_override
        .map(PathBuf::from)
        .or_else(|| env::var_os("ProgramData").map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from(r"C:\ProgramData"));
    program_data.join("SiteBlock").join("config.json")
}

#[must_use]
pub fn hosts_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        resolve_windows_hosts_path(None)
    }
    #[cfg(target_os = "linux")]
    {
        PathBuf::from(UNIX_HOSTS_PATH)
    }
}

#[must_use]
pub fn config_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        resolve_windows_config_path(None)
    }
    #[cfg(target_os = "linux")]
    {
        PathBuf::from(UNIX_CONFIG_PATH)
    }
}

#[must_use]
pub fn runtime_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data = env::var_os("ProgramData")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(r"C:\ProgramData"));
        program_data.join("SiteBlock")
    }
    #[cfg(target_os = "linux")]
    {
        PathBuf::from(UNIX_RUNTIME_DIR)
    }
}

#[must_use]
pub fn focus_stats_dir() -> PathBuf {
    runtime_dir().join("focus")
}

#[must_use]
pub fn audit_log_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        runtime_dir().join("logs").join("siteblock-admin.log")
    }
    #[cfg(target_os = "linux")]
    {
        PathBuf::from(UNIX_AUDIT_LOG_PATH)
    }
}

#[must_use]
pub fn admin_binary_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(current) = env::current_exe() {
            if let Some(dir) = current.parent() {
                let candidates = [
                    dir.join("siteblock-admin.exe"),
                    dir.join("resources").join("siteblock-admin.exe"),
                ];
                for candidate in candidates {
                    if candidate.is_file() {
                        return candidate;
                    }
                }
            }
        }

        let program_files = env::var_os("ProgramFiles")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(r"C:\Program Files"));
        let candidates = [
            program_files.join("SiteBlock").join("siteblock-admin.exe"),
            program_files.join("SiteBlock").join("resources").join("siteblock-admin.exe"),
        ];
        for candidate in candidates {
            if candidate.is_file() {
                return candidate;
            }
        }
        program_files.join("SiteBlock").join("siteblock-admin.exe")
    }
    #[cfg(target_os = "linux")]
    {
        PathBuf::from(UNIX_ADMIN_BINARY_PATH)
    }
}

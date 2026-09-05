use siteblock_lib::infrastructure::paths;
use std::path::PathBuf;

#[test]
fn test_system_paths_resolution() {
    let hosts = paths::hosts_path();
    let config = paths::config_path();
    let runtime = paths::runtime_dir();
    let stats = paths::focus_stats_dir();
    let log = paths::audit_log_path();
    let admin = paths::admin_binary_path();

    #[cfg(target_os = "linux")]
    {
        assert_eq!(hosts, PathBuf::from("/etc/hosts"));
        assert_eq!(config, PathBuf::from("/etc/siteblock/config.json"));
        assert_eq!(runtime, PathBuf::from("/var/lib/siteblock"));
        assert_eq!(stats, PathBuf::from("/var/lib/siteblock/focus"));
        assert_eq!(log, PathBuf::from("/var/log/siteblock-admin.log"));
        assert_eq!(admin, PathBuf::from("/usr/local/lib/siteblock/siteblock-admin"));
    }

    #[cfg(target_os = "windows")]
    {
        assert!(hosts.ends_with(r"System32\drivers\etc\hosts"));
        assert!(config.ends_with(r"SiteBlock\config.json"));
        assert!(runtime.ends_with(r"SiteBlock"));
        assert!(stats.ends_with(r"SiteBlock\focus"));
        assert!(log.ends_with(r"SiteBlock\logs\siteblock-admin.log"));
        assert!(admin.ends_with(r"SiteBlock\siteblock-admin.exe"));
    }
}

#[test]
fn test_windows_paths_custom_env() {
    let custom_sysroot = paths::resolve_windows_hosts_path(Some(r"D:\WinCustom"));
    let normalized_sysroot = custom_sysroot.to_string_lossy().replace('/', "\\");
    assert_eq!(normalized_sysroot, r"D:\WinCustom\System32\drivers\etc\hosts");

    let custom_program_data = paths::resolve_windows_config_path(Some(r"D:\CustomData"));
    let normalized_program_data = custom_program_data.to_string_lossy().replace('/', "\\");
    assert_eq!(normalized_program_data, r"D:\CustomData\SiteBlock\config.json");
}

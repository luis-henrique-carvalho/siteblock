pub mod assets;
pub mod installer;
pub mod policy;
pub mod session;

pub use installer::run_installer;
pub use policy::{
    write_chromium_policies, BrowserEngine, BrowserSpec, BROWSER_SPECS, FIREFOX_OWNERSHIP_PATH,
    FIREFOX_POLICY_PATH,
};
pub use session::{create_admin_stream, PlatformSessionTransport};

#[allow(unsafe_code)]
pub fn is_root() -> bool {
    extern "C" {
        fn geteuid() -> u32;
    }
    unsafe { geteuid() == 0 }
}

pub fn get_file_mode(path: &std::path::Path) -> u32 {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path).map_or(0o644, |m| m.permissions().mode())
}

pub fn replace_file_atomically(
    path: &std::path::Path,
    tmp_path: &std::path::Path,
    mode: u32,
) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(tmp_path, std::fs::Permissions::from_mode(mode))?;
    std::fs::rename(tmp_path, path)
}

pub fn flush_dns() {
    let _ = std::process::Command::new("resolvectl")
        .arg("flush-caches")
        .status();
    let _ = std::process::Command::new("systemd-resolve")
        .arg("--flush-caches")
        .status();
    let _ = std::process::Command::new("nscd")
        .args(["-i", "hosts"])
        .status();
}

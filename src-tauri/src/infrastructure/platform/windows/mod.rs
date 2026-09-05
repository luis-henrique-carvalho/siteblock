pub mod installer;
pub mod policy;
pub mod session;

pub use installer::run_installer;
pub use policy::{
    write_chromium_policies, BrowserEngine, BrowserSpec, BROWSER_SPECS,
};
pub use session::{create_admin_stream, PlatformSessionTransport};

pub fn get_file_mode(_path: &std::path::Path) -> u32 {
    0o644
}

pub fn replace_file_atomically(
    path: &std::path::Path,
    tmp_path: &std::path::Path,
    _mode: u32,
) -> std::io::Result<()> {
    if path.exists() {
        let backup_path = path.with_extension(format!("bak.{}", std::process::id()));
        if backup_path.exists() {
            let _ = std::fs::remove_file(&backup_path);
        }
        std::fs::rename(path, &backup_path)?;
        if let Err(err) = std::fs::rename(tmp_path, path) {
            let _ = std::fs::rename(&backup_path, path);
            return Err(err);
        }
        let _ = std::fs::remove_file(&backup_path);
        Ok(())
    } else {
        std::fs::rename(tmp_path, path)
    }
}

#[allow(unsafe_code)]
pub fn is_root() -> bool {
    use std::mem::MaybeUninit;
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::{
        GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
    };
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token: HANDLE = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut elevation: MaybeUninit<TOKEN_ELEVATION> = MaybeUninit::uninit();
        let mut size: u32 = 0;
        let result = GetTokenInformation(
            token,
            TokenElevation,
            elevation.as_mut_ptr().cast(),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut size,
        );
        CloseHandle(token);
        if result == 0 {
            return false;
        }
        elevation.assume_init().TokenIsElevated != 0
    }
}

pub fn flush_dns() {
    let _ = std::process::Command::new("ipconfig")
        .arg("/flushdns")
        .status();
}

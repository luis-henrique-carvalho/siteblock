use std::{fs, io::Write, path::Path};

use crate::infrastructure::platform::imp::replace_file_atomically;

/// Replaces a file atomically after writing and syncing its new contents.
pub fn atomic_write(path: &Path, content: &[u8], mode: u32) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary_path = path.with_extension(format!("tmp.{}", std::process::id()));
    {
        let mut file = fs::File::create(&temporary_path)?;
        file.write_all(content)?;
        file.sync_all()?;
    }

    replace_file_atomically(path, &temporary_path, mode)
}

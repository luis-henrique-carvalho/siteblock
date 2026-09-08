use siteblock_lib::infrastructure::atomic_file::atomic_write;

#[test]
fn atomic_write_creates_and_replaces_files() {
    let temporary_directory =
        std::env::temp_dir().join(format!("siteblock_test_{}", std::process::id()));
    let test_file = temporary_directory.join("sub").join("test_file");
    let _ = std::fs::remove_dir_all(&temporary_directory);

    atomic_write(&test_file, b"initial content", 0o644).expect("deve escrever novo arquivo");
    assert_eq!(
        std::fs::read_to_string(&test_file).unwrap(),
        "initial content"
    );

    atomic_write(&test_file, b"updated content", 0o644).expect("deve substituir arquivo existente");
    assert_eq!(
        std::fs::read_to_string(&test_file).unwrap(),
        "updated content"
    );

    let _ = std::fs::remove_dir_all(&temporary_directory);
}

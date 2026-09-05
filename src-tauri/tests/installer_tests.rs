use siteblock_lib::infrastructure::system_installer::{build_schtasks_create_command, build_schtasks_delete_command};

#[test]
fn test_build_schtasks_create_command() {
    let args = build_schtasks_create_command(r"C:\Program Files\SiteBlock\siteblock-admin.exe");
    assert_eq!(args[0], "/create");
    assert_eq!(args[1], "/tn");
    assert_eq!(args[2], "SiteBlockReconcile");
    assert_eq!(args[3], "/tr");
    assert_eq!(args[4], r#""C:\Program Files\SiteBlock\siteblock-admin.exe" reconcile"#);
    assert_eq!(args[5], "/sc");
    assert_eq!(args[6], "minute");
    assert_eq!(args[7], "/mo");
    assert_eq!(args[8], "1");
    assert_eq!(args[9], "/ru");
    assert_eq!(args[10], "SYSTEM");
    assert_eq!(args[11], "/f");
}

#[test]
fn test_build_schtasks_delete_command() {
    let args = build_schtasks_delete_command();
    assert_eq!(args[0], "/delete");
    assert_eq!(args[1], "/tn");
    assert_eq!(args[2], "SiteBlockReconcile");
    assert_eq!(args[3], "/f");
}

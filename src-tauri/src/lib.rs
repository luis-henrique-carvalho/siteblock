use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    os::unix::fs::PermissionsExt,
    path::Path,
    process::{Child, ChildStdin, ChildStdout, Command, Stdio},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

const HELPER: &str = "/usr/local/lib/siteblock/siteblock-admin";
const HELPER_SOURCE: &str = include_str!("../../scripts/siteblock-admin");
const SERVICE_SOURCE: &str = include_str!("../../scripts/siteblock-reconcile.service");
const TIMER_SOURCE: &str = include_str!("../../scripts/siteblock-reconcile.timer");
const POLICY_SOURCE: &str = include_str!("../../scripts/com.luis.siteblock.policy");
const INSTALLER_SOURCE: &str = r#"#!/bin/sh
set -eu
source_dir=$1
install -d -m 0755 /usr/local/lib/siteblock /etc/siteblock
install -o root -g root -m 0755 "$source_dir/siteblock-admin" /usr/local/lib/siteblock/siteblock-admin
install -o root -g root -m 0644 "$source_dir/siteblock-reconcile.service" /etc/systemd/system/siteblock-reconcile.service
install -o root -g root -m 0644 "$source_dir/siteblock-reconcile.timer" /etc/systemd/system/siteblock-reconcile.timer
install -o root -g root -m 0644 "$source_dir/com.luis.siteblock.policy" /usr/share/polkit-1/actions/com.luis.siteblock.policy
systemctl daemon-reload
systemctl enable --now siteblock-reconcile.timer
systemctl start siteblock-reconcile.service
exec /usr/local/lib/siteblock/siteblock-admin session
"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Schedule {
    id: String,
    days: Vec<u8>,
    start: String,
    end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteBlockConfig {
    enabled: bool,
    domains: Vec<String>,
    schedules: Vec<Schedule>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteBlockState {
    active: bool,
    enabled: bool,
    domains: Vec<String>,
    schedules: Vec<Schedule>,
    helper_installed: bool,
    #[serde(default)]
    session_supported: bool,
}

#[derive(Default)]
struct PrivilegedSession {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    stdout: Option<BufReader<ChildStdout>>,
}

fn helper_installed() -> bool {
    Path::new(HELPER).is_file()
}
fn empty_state() -> SiteBlockState {
    SiteBlockState {
        active: false,
        enabled: false,
        domains: vec![],
        schedules: vec![],
        helper_installed: false,
        session_supported: false,
    }
}
fn run_helper(args: &[&str]) -> Result<String, String> {
    let output = Command::new(HELPER)
        .args(args)
        .output()
        .map_err(|error| error.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn helper_supports_session() -> bool {
    run_helper(&["capabilities"]).is_ok()
}

fn reset_session(session: &mut PrivilegedSession) {
    if let Some(mut child) = session.child.take() {
        let _ = child.kill();
    }
    session.stdin = None;
    session.stdout = None;
}

fn start_session(session: &mut PrivilegedSession) -> Result<(), String> {
    if let Some(child) = session.child.as_mut() {
        if child
            .try_wait()
            .map_err(|error| error.to_string())?
            .is_none()
        {
            return Ok(());
        }
    }
    reset_session(session);
    let mut child = Command::new("pkexec")
        .args([HELPER, "session"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Não foi possível pedir autorização: {error}"))?;
    session.stdin = child.stdin.take();
    session.stdout = child.stdout.take().map(BufReader::new);
    session.child = Some(child);
    if session.stdin.is_none() || session.stdout.is_none() {
        reset_session(session);
        return Err("Não foi possível iniciar a sessão administrativa.".into());
    }
    Ok(())
}

fn adopt_session(session: &Mutex<PrivilegedSession>, mut child: Child) -> Result<(), String> {
    let mut session = session
        .lock()
        .map_err(|_| "A sessão administrativa está indisponível.")?;
    reset_session(&mut session);
    session.stdin = child.stdin.take();
    session.stdout = child.stdout.take().map(BufReader::new);
    session.child = Some(child);
    if session.stdin.is_none() || session.stdout.is_none() {
        reset_session(&mut session);
        return Err("Não foi possível iniciar a sessão administrativa.".into());
    }
    Ok(())
}

fn session_request(
    session: &Mutex<PrivilegedSession>,
    request: serde_json::Value,
) -> Result<SiteBlockState, String> {
    let mut session = session
        .lock()
        .map_err(|_| "A sessão administrativa está indisponível.")?;
    start_session(&mut session)?;
    let payload = format!(
        "{}\n",
        serde_json::to_string(&request).map_err(|error| error.to_string())?
    );
    let result = (|| -> Result<String, String> {
        session
            .stdin
            .as_mut()
            .ok_or("A sessão administrativa foi encerrada.")?
            .write_all(payload.as_bytes())
            .map_err(|error| error.to_string())?;
        session
            .stdin
            .as_mut()
            .ok_or("A sessão administrativa foi encerrada.")?
            .flush()
            .map_err(|error| error.to_string())?;
        let mut response = String::new();
        let count = session
            .stdout
            .as_mut()
            .ok_or("A sessão administrativa foi encerrada.")?
            .read_line(&mut response)
            .map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("A sessão administrativa foi encerrada.".into());
        }
        Ok(response)
    })();
    match result {
        Ok(response) => {
            let value: serde_json::Value = serde_json::from_str(&response)
                .map_err(|error| format!("Resposta inválida do serviço: {error}"))?;
            if let Some(error) = value.get("error").and_then(serde_json::Value::as_str) {
                return Err(error.into());
            }
            let mut state: SiteBlockState = serde_json::from_value(value)
                .map_err(|error| format!("Resposta inválida do serviço: {error}"))?;
            state.session_supported = true;
            Ok(state)
        }
        Err(error) => {
            reset_session(&mut session);
            Err(error)
        }
    }
}

fn write_asset(path: &Path, content: &str, mode: u32) -> Result<(), String> {
    fs::write(path, content).map_err(|error| error.to_string())?;
    fs::set_permissions(path, fs::Permissions::from_mode(mode)).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_siteblock_status() -> Result<SiteBlockState, String> {
    if !helper_installed() {
        return Ok(empty_state());
    }
    let mut state: SiteBlockState = serde_json::from_str(&run_helper(&["status"])?)
        .map_err(|error| format!("Resposta inválida do serviço: {error}"))?;
    state.session_supported = helper_supports_session();
    Ok(state)
}

#[tauri::command]
fn start_privileged_session(
    session: tauri::State<'_, Mutex<PrivilegedSession>>,
) -> Result<SiteBlockState, String> {
    if !helper_installed() {
        return Ok(empty_state());
    }
    session_request(&session, json!({ "action": "status" }))
}

#[tauri::command]
fn save_siteblock_config(
    config: SiteBlockConfig,
    session: tauri::State<'_, Mutex<PrivilegedSession>>,
) -> Result<SiteBlockState, String> {
    session_request(
        &session,
        json!({ "action": "set-config", "config": config }),
    )
}

#[tauri::command]
fn install_siteblock_service(
    session: tauri::State<'_, Mutex<PrivilegedSession>>,
) -> Result<SiteBlockState, String> {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let directory =
        std::env::temp_dir().join(format!("siteblock-setup-{}-{nonce}", std::process::id()));
    fs::create_dir(&directory)
        .map_err(|error| format!("Não foi possível preparar a instalação: {error}"))?;
    let setup = (|| -> Result<(), String> {
        write_asset(&directory.join("siteblock-admin"), HELPER_SOURCE, 0o755)?;
        write_asset(
            &directory.join("siteblock-reconcile.service"),
            SERVICE_SOURCE,
            0o644,
        )?;
        write_asset(
            &directory.join("siteblock-reconcile.timer"),
            TIMER_SOURCE,
            0o644,
        )?;
        write_asset(
            &directory.join("com.luis.siteblock.policy"),
            POLICY_SOURCE,
            0o644,
        )?;
        write_asset(&directory.join("install"), INSTALLER_SOURCE, 0o755)
    })();
    if let Err(error) = setup {
        let _ = fs::remove_dir_all(&directory);
        return Err(error);
    }
    let child = Command::new("pkexec")
        .arg(directory.join("install"))
        .arg(&directory)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Não foi possível pedir autorização: {error}"))?;
    if let Err(error) = adopt_session(&session, child) {
        let _ = fs::remove_dir_all(&directory);
        return Err(error);
    }
    let result = session_request(&session, json!({ "action": "status" }));
    let _ = fs::remove_dir_all(&directory);
    result
    /*
    serde_json::from_str(&run_helper(&["status"])?)
        .map_err(|error| format!("Resposta inválida do serviço: {error}"))
    */
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(PrivilegedSession::default()))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_siteblock_status,
            start_privileged_session,
            save_siteblock_config,
            install_siteblock_service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use std::{
    fs,
    io::{self, Read, Write},
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
use serde::{Deserialize, Serialize};

const STATE_PATH: &str = "/var/lib/siteblock/effective-state.json";
const CLIENTS_PATH: &str = "/run/siteblock/browser-clients.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct EffectiveStateResponse {
    active: bool,
    domains: Vec<String>,
    revision: u64,
}

fn read_message<R: Read>(reader: &mut R) -> io::Result<Option<serde_json::Value>> {
    let mut header = [0u8; 4];
    match reader.read_exact(&mut header) {
        Ok(_) => {}
        Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }

    let length = u32::from_ne_bytes(header) as usize;
    let mut buffer = vec![0u8; length];
    reader.read_exact(&mut buffer)?;

    let value: serde_json::Value = serde_json::from_slice(&buffer)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

    Ok(Some(value))
}

fn send_message<W: Write>(writer: &mut W, value: &EffectiveStateResponse) -> io::Result<()> {
    let payload = serde_json::to_vec(value)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

    let length = (payload.len() as u32).to_ne_bytes();
    writer.write_all(&length)?;
    writer.write_all(&payload)?;
    writer.flush()?;
    Ok(())
}

fn get_effective_state() -> EffectiveStateResponse {
    if let Ok(content) = fs::read_to_string(STATE_PATH) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            let active = val.get("active").and_then(|v| v.as_bool()).unwrap_or(false);
            let domains = val
                .get("domains")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|d| d.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let revision = val.get("revision").and_then(|v| v.as_u64()).unwrap_or(0);
            return EffectiveStateResponse {
                active,
                domains,
                revision,
            };
        }
    }
    EffectiveStateResponse {
        active: false,
        domains: Vec::new(),
        revision: 0,
    }
}

fn record_client(kind: &str) {
    let path = Path::new(CLIENTS_PATH);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut clients: serde_json::Map<String, serde_json::Value> = fs::read_to_string(path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    clients.insert(kind.to_string(), serde_json::json!(now));
    clients.insert("updatedAt".to_string(), serde_json::json!(now));

    let tmp = path.with_extension("tmp");
    if let Ok(data) = serde_json::to_string(&clients) {
        if fs::write(&tmp, data).is_ok() {
            let _ = fs::rename(&tmp, path);
        }
    }
}

fn main() -> io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let browser_kind = if args.len() > 1 { args[1].as_str() } else { "chromium" };

    record_client(browser_kind);

    let stdin = io::stdin();
    let mut stdin_lock = stdin.lock();
    let stdout = io::stdout();
    let mut stdout_lock = stdout.lock();

    let mut previous_state: Option<EffectiveStateResponse> = None;

    while let Ok(Some(_message)) = read_message(&mut stdin_lock) {
        let current_state = get_effective_state();
        record_client(browser_kind);
        if previous_state.as_ref() != Some(&current_state) {
            send_message(&mut stdout_lock, &current_state)?;
            previous_state = Some(current_state);
        }
    }



    Ok(())
}

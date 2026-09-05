use std::io::{self, BufRead, Read, Write};

use siteblock_lib::domain::entities::{FocusStatisticsQuery, SiteBlockConfig};
use siteblock_lib::infrastructure::system_core::{
    apply_config, get_admin_capabilities, get_current_state, handle_admin_session_line_with,
    is_root, query_focus_statistics, read_config, write_config_file,
};

fn append_audit_log(message: &str) {
    let log_path = siteblock_lib::infrastructure::paths::audit_log_path();
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let _ = writeln!(file, "[{}] {}", timestamp, message);
    }
}

pub fn run_session_loop<R: BufRead, W: Write>(
    reader: R,
    mut writer: W,
) -> Result<(), Box<dyn std::error::Error>> {
    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let response_json = match serde_json::from_str::<serde_json::Value>(trimmed) {
            Ok(request)
                if request.get("action").and_then(serde_json::Value::as_str)
                    == Some("get-focus-statistics") =>
            {
                let response = request
                    .get("query")
                    .cloned()
                    .ok_or_else(|| "Campo 'query' ausente no pedido.".to_string())
                    .and_then(|value| {
                        serde_json::from_value::<FocusStatisticsQuery>(value)
                            .map_err(|error| error.to_string())
                    })
                    .and_then(|query| query_focus_statistics(&read_config(), &query));
                let response = response
                    .and_then(|statistics| {
                        serde_json::to_value(statistics).map_err(|error| error.to_string())
                    })
                    .unwrap_or_else(|error| serde_json::json!({ "error": error }));
                serde_json::to_string(&response)
                    .unwrap_or_else(|error| format!("{{\"error\":\"{}\"}}", error))
            }
            _ => handle_admin_session_line_with(trimmed, read_config, |config| {
                append_audit_log(&format!(
                    "Ação set-config: aplicando enabled={}, perfis={}, domínios_legados={}",
                    config.enabled,
                    config.profiles.len(),
                    config.domains.len()
                ));
                let _ = write_config_file(config);
                apply_config(config)
            }),
        };

        writeln!(writer, "{}", response_json)?;
        writer.flush()?;
    }

    Ok(())
}

fn run_session(pipe_name: Option<&str>) -> Result<(), Box<dyn std::error::Error>> {
    if !is_root() {
        eprintln!("Erro: Essa ação precisa de autorização administrativa.");
        std::process::exit(1);
    }

    append_audit_log(&format!(
        "Sessão administrativa iniciada (PID: {}, pipe: {:?})",
        std::process::id(),
        pipe_name
    ));

    let (reader, writer) = siteblock_lib::infrastructure::platform::imp::create_admin_stream(
        pipe_name.as_deref(),
    )?;
    run_session_loop(reader, writer)
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let command = if args.len() > 1 { args[1].as_str() } else { "" };

    match command {
        "status" => {
            let config = read_config();
            let state = get_current_state(&config, None, None);
            println!("{}", serde_json::to_string(&state).unwrap_or_default());
        }
        "capabilities" => {
            let cap = get_admin_capabilities();
            println!("{}", serde_json::to_string(&cap).unwrap_or_default());
        }
        "session" => {
            let pipe_arg = args.iter().position(|a| a == "--pipe").and_then(|idx| args.get(idx + 1)).map(String::as_str);
            if let Err(err) = run_session(pipe_arg) {
                eprintln!("Erro na sessão: {}", err);
                std::process::exit(1);
            }
        }
        "set-config" => {
            if !is_root() {
                eprintln!("Erro: Essa ação precisa de autorização administrativa.");
                std::process::exit(1);
            }
            let stdin = io::stdin();
            let mut buffer = String::new();
            if stdin.lock().read_to_string(&mut buffer).is_ok() {
                match serde_json::from_str::<SiteBlockConfig>(&buffer) {
                    Ok(mut config) => {
                        config.ensure_migrated();
                        if let Err(err) = config.validate() {
                            eprintln!("Erro de validação: {}", err);
                            std::process::exit(1);
                        }
                        let _ = write_config_file(&config);
                        let state = apply_config(&config);
                        println!("{}", serde_json::to_string(&state).unwrap_or_default());
                    }
                    Err(err) => {
                        eprintln!("Erro ao analisar configuração: {}", err);
                        std::process::exit(1);
                    }
                }
            }
        }
        "reconcile" => {
            if !is_root() {
                eprintln!("Erro: Essa ação precisa de autorização administrativa.");
                std::process::exit(1);
            }
            let config = read_config();
            append_audit_log(&format!(
                "Reconcile periódico executado: enabled={}, perfis={}",
                config.enabled,
                config.profiles.len()
            ));
            let state = apply_config(&config);
            println!("{}", serde_json::to_string(&state).unwrap_or_default());
        }
        _ => {
            eprintln!("Uso: siteblock-admin status|set-config|reconcile|session [--pipe <name>]|capabilities");
            std::process::exit(2);
        }
    }
}

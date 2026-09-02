use std::io::{self, BufRead, Read, Write};

use siteblock_lib::domain::entities::SiteBlockConfig;
use siteblock_lib::infrastructure::system_core::{
    apply_config, get_admin_capabilities, get_current_state, handle_admin_session_line_with,
    is_root, read_config, write_config_file,
};

fn append_audit_log(message: &str) {
    let log_path = "/var/log/siteblock-admin.log";
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let _ = writeln!(file, "[{}] {}", timestamp, message);
    }
}

fn run_session() -> Result<(), Box<dyn std::error::Error>> {
    if !is_root() {
        eprintln!("Erro: Essa ação precisa de autorização administrativa.");
        std::process::exit(1);
    }

    append_audit_log(&format!(
        "Sessão administrativa iniciada (PID: {})",
        std::process::id()
    ));

    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout_lock = stdout.lock();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let response_json = handle_admin_session_line_with(
            trimmed,
            read_config,
            |config| {
                append_audit_log(&format!(
                    "Ação set-config: aplicando enabled={}, perfis={}, domínios_legados={}",
                    config.enabled,
                    config.profiles.len(),
                    config.domains.len()
                ));
                let _ = write_config_file(config);
                apply_config(config)
            },
        );

        let _ = writeln!(stdout_lock, "{}", response_json);
        let _ = stdout_lock.flush();
    }

    Ok(())
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
            if let Err(err) = run_session() {
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
            eprintln!("Uso: siteblock-admin status|set-config|reconcile|session|capabilities");
            std::process::exit(2);
        }
    }
}

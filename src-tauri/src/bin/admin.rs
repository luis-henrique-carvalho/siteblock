use std::io::{self, BufRead, Read, Write};

use siteblock_lib::domain::entities::SiteBlockConfig;
use siteblock_lib::infrastructure::system_core::{
    apply_config, get_current_state, is_root, read_config, write_config_file,
};

fn run_session() -> Result<(), Box<dyn std::error::Error>> {
    if !is_root() {
        eprintln!("Erro: Essa ação precisa de autorização administrativa.");
        std::process::exit(1);
    }

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

        let response_json = match serde_json::from_str::<serde_json::Value>(trimmed) {
            Ok(request) => {
                let action = request.get("action").and_then(|v| v.as_str()).unwrap_or("");
                match action {
                    "status" => {
                        let cfg = read_config();
                        let state = get_current_state(&cfg, None, None);
                        serde_json::to_string(&state).unwrap_or_else(|e| format!("{{\"error\":\"{}\"}}", e))
                    }
                    "set-config" => {
                        if let Some(config_val) = request.get("config") {
                            match serde_json::from_value::<SiteBlockConfig>(config_val.clone()) {
                                Ok(config) => match config.validate() {
                                    Ok(_) => {
                                        let _ = write_config_file(&config);
                                        let state = apply_config(&config);
                                        serde_json::to_string(&state).unwrap_or_else(|e| format!("{{\"error\":\"{}\"}}", e))
                                    }
                                    Err(validation_err) => {
                                        format!("{{\"error\":\"{}\"}}", validation_err)
                                    }
                                },
                                Err(parse_err) => {
                                    format!("{{\"error\":\"Configuração inválida: {}\"}}", parse_err)
                                }
                            }
                        } else {
                            "{\"error\":\"Campo 'config' ausente no pedido.\"}".to_string()
                        }
                    }
                    _ => {
                        format!("{{\"error\":\"Ação desconhecida: {}\"}}", action)
                    }
                }
            }
            Err(err) => {
                format!("{{\"error\":\"JSON inválido: {}\"}}", err)
            }
        };

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
            let cap = serde_json::json!({
                "session": true,
                "browserIntegration": true,
                "integrationVersion": 2
            });
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
            if let Ok(_) = stdin.lock().read_to_string(&mut buffer) {
                match serde_json::from_str::<SiteBlockConfig>(&buffer) {
                    Ok(config) => {
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
            let state = apply_config(&config);
            println!("{}", serde_json::to_string(&state).unwrap_or_default());
        }
        _ => {
            eprintln!("Uso: siteblock-admin status|set-config|reconcile|session|capabilities");
            std::process::exit(2);
        }
    }
}

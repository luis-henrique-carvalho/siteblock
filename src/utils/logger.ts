import { invoke } from "@tauri-apps/api/core";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type LogDomain =
  | "State"
  | "Protection"
  | "Profiles"
  | "Domains"
  | "Schedules"
  | "Config"
  | "Service"
  | "Session"
  | "Statistics";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  domain: LogDomain;
  message: string;
  data?: unknown;
}

class FrontendLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private addLog(level: LogLevel, domain: LogDomain, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      domain,
      message,
      data,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[SiteBlock UI] [${domain}]`;
    switch (level) {
      case "DEBUG":
        if (import.meta.env?.DEV) {
          console.debug(prefix, message, data ?? "");
        }
        break;
      case "INFO":
        console.info(prefix, message, data ?? "");
        break;
      case "WARN":
        console.warn(prefix, message, data ?? "");
        break;
      case "ERROR":
        console.error(prefix, message, data ?? "");
        break;
    }

    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const detail = data ? ` | ${JSON.stringify(data)}` : "";
        invoke("log_client_message", {
          level,
          domain,
          category: domain,
          message: `${message}${detail}`,
        }).catch(() => {});
      }
    } catch {
      // Ignora erro fora do ambiente Tauri
    }
  }

  debug(domain: LogDomain, message: string, data?: unknown) {
    this.addLog("DEBUG", domain, message, data);
  }

  info(domain: LogDomain, message: string, data?: unknown) {
    this.addLog("INFO", domain, message, data);
  }

  warn(domain: LogDomain, message: string, data?: unknown) {
    this.addLog("WARN", domain, message, data);
  }

  error(domain: LogDomain, message: string, data?: unknown) {
    this.addLog("ERROR", domain, message, data);
  }

  getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new FrontendLogger();

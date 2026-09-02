export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

class FrontendLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private addLog(level: LogLevel, category: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[SiteBlock UI] [${category}]`;
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
  }

  debug(category: string, message: string, data?: unknown) {
    this.addLog("DEBUG", category, message, data);
  }

  info(category: string, message: string, data?: unknown) {
    this.addLog("INFO", category, message, data);
  }

  warn(category: string, message: string, data?: unknown) {
    this.addLog("WARN", category, message, data);
  }

  error(category: string, message: string, data?: unknown) {
    this.addLog("ERROR", category, message, data);
  }

  getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new FrontendLogger();

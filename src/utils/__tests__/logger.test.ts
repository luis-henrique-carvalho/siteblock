import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe("FrontendLogger", () => {
  beforeEach(() => {
    logger.clearLogs();
    vi.clearAllMocks();
  });

  it("stores logs with correct domain and level in memory", () => {
    logger.info("Protection", "Ativando proteção");
    logger.debug("State", "Status lido");
    logger.warn("Domains", "Domínio duplicado");
    logger.error("Service", "Erro no helper");

    const logs = logger.getRecentLogs();
    expect(logs).toHaveLength(4);

    expect(logs[0].domain).toBe("Protection");
    expect(logs[0].level).toBe("INFO");
    expect(logs[0].message).toBe("Ativando proteção");

    expect(logs[1].domain).toBe("State");
    expect(logs[1].level).toBe("DEBUG");

    expect(logs[2].domain).toBe("Domains");
    expect(logs[2].level).toBe("WARN");

    expect(logs[3].domain).toBe("Service");
    expect(logs[3].level).toBe("ERROR");
  });

  it("invokes log_client_message when running inside Tauri window", () => {
    const originalWindow = globalThis.window;
    // Simula ambiente Tauri
    (globalThis as unknown as { window: Record<string, unknown> }).window = {
      __TAURI_INTERNALS__: {},
    };

    logger.info("Config", "Salvando configuração", { revision: 42 });

    expect(invoke).toHaveBeenCalledWith("log_client_message", {
      level: "INFO",
      domain: "Config",
      category: "Config",
      message: "Salvando configuração | {\"revision\":42}",
    });

    globalThis.window = originalWindow;
  });

  it("clears logs correctly", () => {
    logger.info("Profiles", "Perfil criado");
    expect(logger.getRecentLogs()).toHaveLength(1);
    logger.clearLogs();
    expect(logger.getRecentLogs()).toHaveLength(0);
  });
});

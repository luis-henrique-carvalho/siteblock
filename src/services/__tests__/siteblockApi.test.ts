import { beforeEach, describe, expect, it, vi } from "vitest";
import { TauriSiteBlockApi } from "../siteblockApi";
import { invoke } from "@tauri-apps/api/core";
import type { SiteBlockState } from "../../types/siteblock";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("TauriSiteBlockApi", () => {
  let api: TauriSiteBlockApi;
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
    api = new TauriSiteBlockApi();
  });

  it("getStatus calls get_siteblock_status", async () => {
    const mockStatus = { active: true } as unknown as SiteBlockState;
    mockInvoke.mockResolvedValueOnce(mockStatus);

    const result = await api.getStatus();
    expect(mockInvoke).toHaveBeenCalledWith("get_siteblock_status");
    expect(result).toBe(mockStatus);
  });

  it("startPrivilegedSession calls start_privileged_session", async () => {
    const mockStatus = { active: true } as unknown as SiteBlockState;
    mockInvoke.mockResolvedValueOnce(mockStatus);

    const result = await api.startPrivilegedSession();
    expect(mockInvoke).toHaveBeenCalledWith("start_privileged_session");
    expect(result).toBe(mockStatus);
  });

  it("saveConfig calls save_siteblock_config with config payload", async () => {
    const mockStatus = { active: true } as unknown as SiteBlockState;
    mockInvoke.mockResolvedValueOnce(mockStatus);
    const config = {
      enabled: true,
      profiles: [
        {
          id: "focus",
          name: "Foco",
          icon: "target",
          color: "blue",
          enabled: true,
          domains: ["reddit.com"],
          schedules: [],
        },
      ],
      domains: ["reddit.com"],
      schedules: [],
    };

    const result = await api.saveConfig(config);
    expect(mockInvoke).toHaveBeenCalledWith("save_siteblock_config", { config });
    expect(result).toBe(mockStatus);
  });

  it("installService calls install_siteblock_service", async () => {
    const mockStatus = { helperInstalled: true } as unknown as SiteBlockState;
    mockInvoke.mockResolvedValueOnce(mockStatus);

    const result = await api.installService();
    expect(mockInvoke).toHaveBeenCalledWith("install_siteblock_service");
    expect(result).toBe(mockStatus);
  });
});

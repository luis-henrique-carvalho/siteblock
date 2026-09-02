import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSiteBlock } from "../useSiteBlock";
import type { ISiteBlockApi } from "../../services/siteblockApi";
import type { SiteBlockState } from "../../types/siteblock";

const mockInitialState: SiteBlockState = {
  active: false,
  enabled: false,
  domains: ["facebook.com"],
  schedules: [],
  helperInstalled: true,
  sessionSupported: true,
  revision: 1,
  browserIntegrations: [],
};

describe("useSiteBlock", () => {
  let mockApi: ISiteBlockApi;

  beforeEach(() => {
    mockApi = {
      getStatus: vi.fn().mockResolvedValue(mockInitialState),
      startPrivilegedSession: vi.fn().mockResolvedValue(mockInitialState),
      saveConfig: vi.fn().mockImplementation((config) =>
        Promise.resolve({
          ...mockInitialState,
          enabled: config.enabled,
          domains: config.domains,
          schedules: config.schedules,
        }),
      ),
      installService: vi.fn().mockResolvedValue({
        ...mockInitialState,
        helperInstalled: true,
      }),
    };
  });

  it("loads initial status and starts privileged session if helper is installed", async () => {
    const { result } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    expect(mockApi.getStatus).toHaveBeenCalled();
    expect(mockApi.startPrivilegedSession).toHaveBeenCalled();
    expect(result.current.state?.domains).toEqual(["facebook.com"]);
  });

  it("toggles enabled status via toggleEnabled", async () => {
    const { result } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    await act(async () => {
      await result.current.toggleEnabled();
    });

    expect(mockApi.saveConfig).toHaveBeenCalledWith({
      enabled: true,
      domains: ["facebook.com"],
      schedules: [],
    });
    expect(result.current.state?.enabled).toBe(true);
    expect(result.current.message).toBe("Bloqueio ativado.");
  });

  it("adds a valid new domain", async () => {
    const { result } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    let success = false;
    await act(async () => {
      success = await result.current.addDomain("https://www.youtube.com");
    });

    expect(success).toBe(true);
    expect(mockApi.saveConfig).toHaveBeenCalledWith({
      enabled: false,
      domains: ["facebook.com", "youtube.com"],
      schedules: [],
    });
    expect(result.current.message).toBe("youtube.com adicionado.");
  });

  it("rejects invalid domain and sets error message", async () => {
    const { result } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    let success = false;
    await act(async () => {
      success = await result.current.addDomain("invalid-domain-");
    });

    expect(success).toBe(false);
    expect(mockApi.saveConfig).not.toHaveBeenCalled();
    expect(result.current.message).toBe("Informe um domínio válido, como reddit.com.");
  });

  it("removes a domain", async () => {
    const { result } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    await act(async () => {
      await result.current.removeDomain("facebook.com");
    });

    expect(mockApi.saveConfig).toHaveBeenCalledWith({
      enabled: false,
      domains: [],
      schedules: [],
    });
    expect(result.current.message).toBe("facebook.com removido.");
  });
});

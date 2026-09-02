import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSiteBlock } from "../useSiteBlock";
import type { ISiteBlockApi } from "../../services/siteblockApi";
import type { Profile, SiteBlockState } from "../../types/siteblock";

const mockFocusProfile: Profile = {
  id: "focus",
  name: "Foco",
  icon: "target",
  color: "blue",
  enabled: true,
  domains: ["facebook.com"],
  schedules: [],
};

const mockInitialState: SiteBlockState = {
  active: false,
  enabled: false,
  profiles: [mockFocusProfile],
  activeProfileIds: ["focus"],
  effectiveDomains: ["facebook.com"],
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
          profiles: config.profiles,
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
    expect(result.current.selectedProfile?.domains).toEqual(["facebook.com"]);
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
      profiles: [mockFocusProfile],
      domains: ["facebook.com"],
      schedules: [],
    });
    expect(result.current.state?.enabled).toBe(true);
    expect(result.current.message).toBe("Bloqueio ativado.");
  });

  it("adds a valid new domain to selected profile", async () => {
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
      profiles: [{ ...mockFocusProfile, domains: ["facebook.com", "youtube.com"] }],
      domains: ["facebook.com"],
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

  it("removes a domain from selected profile", async () => {
    const { result } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    await act(async () => {
      await result.current.removeDomain("facebook.com");
    });

    expect(mockApi.saveConfig).toHaveBeenCalledWith({
      enabled: false,
      profiles: [{ ...mockFocusProfile, domains: [] }],
      domains: ["facebook.com"],
      schedules: [],
    });
    expect(result.current.message).toBe("facebook.com removido.");
  });

  it("updates state when onStateChanged event is received", async () => {
    let listener: ((state: SiteBlockState) => void) | null = null;
    const mockUnlisten = vi.fn();
    mockApi.onStateChanged = vi.fn((cb) => {
      listener = cb;
      return mockUnlisten;
    });

    const { result } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    expect(mockApi.onStateChanged).toHaveBeenCalled();
    expect(listener).not.toBeNull();

    const updatedState: SiteBlockState = {
      ...mockInitialState,
      enabled: true,
      active: true,
      revision: 2,
    };

    act(() => {
      listener!(updatedState);
    });

    expect(result.current.state?.enabled).toBe(true);
    expect(result.current.state?.active).toBe(true);
    expect(result.current.state?.revision).toBe(2);
  });

  it("removes onStateChanged listener on unmount", async () => {
    const mockUnlisten = vi.fn();
    mockApi.onStateChanged = vi.fn(() => mockUnlisten);

    const { unmount } = renderHook(() => useSiteBlock({ api: mockApi }));

    await waitFor(() => {
      expect(mockApi.onStateChanged).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnlisten).toHaveBeenCalled();
  });
});

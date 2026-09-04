import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSiteBlockStore } from "../useSiteBlockStore";
import { useUIStore } from "../useUIStore";
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
  enabledBrowsers: ["Chrome", "Brave", "Firefox"],
};

describe("useSiteBlockStore", () => {
  let mockApi: ISiteBlockApi;

  beforeEach(() => {
    useSiteBlockStore.getState().reset();
    useUIStore.getState().reset();

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

  it("loads initial state and starts privileged session when helper is installed", async () => {
    await useSiteBlockStore.getState().init(mockApi);

    const { state, selectedProfileId, getSelectedProfile } = useSiteBlockStore.getState();
    expect(state).not.toBeNull();
    expect(selectedProfileId).toBe("focus");
    expect(getSelectedProfile()?.name).toBe("Foco");
    expect(mockApi.getStatus).toHaveBeenCalled();
    expect(mockApi.startPrivilegedSession).toHaveBeenCalled();
  });

  it("toggles enabled state via toggleEnabled", async () => {
    await useSiteBlockStore.getState().init(mockApi);
    await useSiteBlockStore.getState().toggleEnabled();

    expect(mockApi.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
    expect(useSiteBlockStore.getState().state?.enabled).toBe(true);
    expect(useUIStore.getState().message).toBe("Bloqueio ativado.");
  });

  it("adds a valid domain to selected profile", async () => {
    await useSiteBlockStore.getState().init(mockApi);

    const success = await useSiteBlockStore.getState().addDomain("github.com");
    expect(success).toBe(true);

    const selected = useSiteBlockStore.getState().getSelectedProfile();
    expect(selected?.domains).toContain("github.com");
    expect(useUIStore.getState().message).toBe("github.com adicionado.");
  });

  it("rejects invalid domain without calling saveConfig", async () => {
    await useSiteBlockStore.getState().init(mockApi);

    const success = await useSiteBlockStore.getState().addDomain("invalid-domain-");
    expect(success).toBe(false);
    expect(useUIStore.getState().message).toBe("Informe um domínio válido, como reddit.com.");
  });

  it("removes domain from selected profile", async () => {
    await useSiteBlockStore.getState().init(mockApi);
    await useSiteBlockStore.getState().removeDomain("facebook.com");

    const selected = useSiteBlockStore.getState().getSelectedProfile();
    expect(selected?.domains).not.toContain("facebook.com");
    expect(useUIStore.getState().message).toBe("facebook.com removido.");
  });

  it("creates, updates, duplicates, and deletes profiles", async () => {
    await useSiteBlockStore.getState().init(mockApi);

    // Create
    await useSiteBlockStore.getState().createProfile("Estudos", "book", "green");
    let profiles = useSiteBlockStore.getState().state?.profiles ?? [];
    expect(profiles.length).toBe(2);
    expect(profiles.some((p) => p.name === "Estudos")).toBe(true);
    const createdId = useSiteBlockStore.getState().selectedProfileId;

    // Update
    await useSiteBlockStore.getState().updateProfile(createdId, { name: "Estudos Avançados" });
    const updated = useSiteBlockStore.getState().getSelectedProfile();
    expect(updated?.name).toBe("Estudos Avançados");

    // Duplicate
    await useSiteBlockStore.getState().duplicateProfile(createdId);
    profiles = useSiteBlockStore.getState().state?.profiles ?? [];
    expect(profiles.length).toBe(3);
    expect(profiles.some((p) => p.name === "Estudos Avançados (cópia)")).toBe(true);

    // Delete
    await useSiteBlockStore.getState().deleteProfile(createdId);
    profiles = useSiteBlockStore.getState().state?.profiles ?? [];
    expect(profiles.length).toBe(2);
    expect(profiles.some((p) => p.id === createdId)).toBe(false);
  });

  it("prevents deleting the last profile", async () => {
    await useSiteBlockStore.getState().init(mockApi);
    await useSiteBlockStore.getState().deleteProfile("focus");

    expect(useSiteBlockStore.getState().state?.profiles.length).toBe(1);
    expect(useUIStore.getState().message).toBe("Você deve manter ao menos um perfil de bloqueio.");
  });

  it("syncs state from external events", async () => {
    await useSiteBlockStore.getState().init(mockApi);

    const externalState: SiteBlockState = {
      ...mockInitialState,
      enabled: true,
      active: true,
      revision: 99,
    };

    useSiteBlockStore.getState().syncState(externalState);
    expect(useSiteBlockStore.getState().state?.revision).toBe(99);
    expect(useSiteBlockStore.getState().state?.active).toBe(true);
  });
});

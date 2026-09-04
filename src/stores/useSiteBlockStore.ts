import { create } from "zustand";
import { INITIAL_EMPTY_STATE } from "../constants/config";
import { siteblockApi, type ISiteBlockApi } from "../services/siteblockApi";
import type { Schedule } from "../types/schedule";
import type { Profile, SiteBlockState } from "../types/siteblock";
import { validateNewDomain } from "@/features/domains";
import { formatSystemError } from "../utils/errorFormatter";
import { logger } from "../utils/logger";
import { useUIStore } from "./useUIStore";
import { getTranslation } from "./usePreferencesStore";

export interface SiteBlockStoreState {
  state: SiteBlockState | null;
  selectedProfileId: string;
  api: ISiteBlockApi;
  initialized: boolean;

  // Selectors/getters
  getSelectedProfile: () => Profile | null;

  // Actions
  setApi: (api: ISiteBlockApi) => void;
  init: (customApi?: ISiteBlockApi) => Promise<(() => void) | undefined>;
  syncState: (newState: SiteBlockState) => void;
  selectProfile: (id: string) => void;
  commit: (next: SiteBlockState, successMessage: string) => Promise<void>;
  toggleEnabled: () => Promise<void>;
  setBrowserEnabled: (browser: string, enabled: boolean) => Promise<void>;
  installService: () => Promise<void>;
  toggleProfileEnabled: (id: string) => Promise<void>;
  createProfile: (name: string, icon?: string, color?: string) => Promise<void>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  duplicateProfile: (id: string) => Promise<void>;
  addDomain: (candidate: string) => Promise<boolean>;
  removeDomain: (domain: string) => Promise<void>;
  updateLocalSchedules: (updater: (prev: Schedule[]) => Schedule[]) => void;
  saveSchedules: (overrideSchedules?: Schedule[]) => Promise<void>;
  reset: () => void;
}

let unlistenStateChanged: (() => void) | null = null;

export const useSiteBlockStore = create<SiteBlockStoreState>((set, get) => ({
  state: null,
  selectedProfileId: "",
  api: siteblockApi,
  initialized: false,

  getSelectedProfile: () => {
    const { state, selectedProfileId } = get();
    if (!state?.profiles || state.profiles.length === 0) return null;
    return state.profiles.find((p) => p.id === selectedProfileId) ?? state.profiles[0];
  },

  setApi: (api: ISiteBlockApi) => {
    set({ api });
  },

  selectProfile: (id: string) => {
    set({ selectedProfileId: id });
  },

  syncState: (newState: SiteBlockState) => {
    const currentSelectedId = get().selectedProfileId;
    let nextSelectedId = currentSelectedId;

    if (newState.profiles && newState.profiles.length > 0) {
      if (!currentSelectedId || !newState.profiles.some((p) => p.id === currentSelectedId)) {
        nextSelectedId = newState.profiles[0].id;
      }
    }

    set({ state: newState, selectedProfileId: nextSelectedId });
  },

  init: async (customApi?: ISiteBlockApi) => {
    const activeApi = customApi ?? get().api;
    if (customApi) {
      set({ api: customApi });
    }

    const { notify, setIntegrationRequired } = useUIStore.getState();
    logger.info("State", "Iniciando carregamento do estado do SiteBlock...");

    let initialState: SiteBlockState | null = null;
    try {
      const nextState = await activeApi.getStatus();
      initialState = nextState;
      logger.debug("State", "Status inicial obtido", nextState);

      if (nextState.helperInstalled && (!nextState.sessionSupported || nextState.helperOutdated)) {
        setIntegrationRequired(true);
        notify("warning", getTranslation("message.integrationUpdate"));
        logger.warn("Service", "Integração precisa ser atualizada (helperOutdated=true)");
      }

      const finalState = nextState.helperInstalled
        ? await activeApi.startPrivilegedSession()
        : nextState;

      let selectedId = get().selectedProfileId;
      if (finalState.profiles && finalState.profiles.length > 0) {
        if (!selectedId || !finalState.profiles.some((p) => p.id === selectedId)) {
          selectedId = finalState.profiles[0].id;
        }
      }

      set({
        state: finalState,
        selectedProfileId: selectedId,
        initialized: true,
      });

      if (finalState.helperOutdated) {
        setIntegrationRequired(true);
        notify("warning", getTranslation("message.integrationUpdate"));
      }

      logger.info("State", "Estado carregado com sucesso", {
        active: finalState.active,
        enabled: finalState.enabled,
        profilesCount: finalState.profiles?.length ?? 0,
        helperInstalled: finalState.helperInstalled,
      });
    } catch (error) {
      logger.error("State", "Falha ao carregar estado inicial", error);
      const fallbackState = initialState ?? INITIAL_EMPTY_STATE;
      set({
        state: fallbackState,
        initialized: true,
      });
      if (initialState?.helperInstalled) {
        setIntegrationRequired(true);
        notify("warning", getTranslation("message.integrationUpdate"));
      } else {
        notify("error", formatSystemError(error));
      }
    }

    // Register event listener if supported by api
    if (activeApi.onStateChanged) {
      if (unlistenStateChanged) {
        unlistenStateChanged();
        unlistenStateChanged = null;
      }

      logger.info("State", "Registrando listener para siteblock://state-changed");
      try {
        const unlisten = await Promise.resolve(
          activeApi.onStateChanged((newState) => {
            logger.info("State", "Estado sincronizado via evento externo", {
              active: newState.active,
              enabled: newState.enabled,
              profilesCount: newState.profiles?.length ?? 0,
            });
            get().syncState(newState);
          }),
        );
        if (typeof unlisten === "function") {
          unlistenStateChanged = unlisten;
          return () => {
            if (unlistenStateChanged === unlisten) {
              unlisten();
              unlistenStateChanged = null;
            }
          };
        }
      } catch (err) {
        logger.error("State", "Erro ao registrar listener onStateChanged", err);
      }
    }
    return undefined;
  },

  commit: async (next: SiteBlockState, successMessage: string) => {
    const { api } = get();
    const { setBusy, notify, setIntegrationRequired } = useUIStore.getState();

    setBusy(true);
    logger.info("Config", "Salvando configuração...", {
      enabled: next.enabled,
      profilesCount: next.profiles?.length ?? 0,
      domains: next.domains,
      schedulesCount: next.schedules?.length ?? 0,
    });

    try {
      const saved = await api.saveConfig({
        enabled: next.enabled,
        enabledBrowsers: next.enabledBrowsers,
        profiles: next.profiles,
        domains: next.domains,
        schedules: next.schedules,
      });

      get().syncState(saved);
      if (saved.helperOutdated) {
        setIntegrationRequired(true);
      }
      if (successMessage) {
        notify("success", successMessage);
      }
      logger.info("Config", "Configuração salva com sucesso", { revision: saved.revision });
    } catch (error) {
      logger.error("Config", "Erro ao salvar configuração", error);
      notify("error", formatSystemError(error));
    } finally {
      setBusy(false);
    }
  },

  toggleEnabled: async () => {
    const { state, commit } = get();
    if (!state) return;
    const nextEnabled = !state.enabled;
    logger.info("Protection", `Alternando bloqueio mestre para: ${nextEnabled}`);
    await commit(
      { ...state, enabled: nextEnabled },
      nextEnabled
        ? getTranslation("message.blockingEnabled")
        : getTranslation("message.blockingDisabled"),
    );
  },

  setBrowserEnabled: async (browser: string, enabled: boolean) => {
    const { state, commit } = get();
    if (!state) return;
    const enabledBrowsers = enabled
      ? Array.from(new Set([...state.enabledBrowsers, browser]))
      : state.enabledBrowsers.filter((item) => item !== browser);
    await commit({ ...state, enabledBrowsers }, getTranslation("message.browserSettingsUpdated"));
  },

  installService: async () => {
    const { api, syncState } = get();
    const { setBusy, notify, setIntegrationRequired } = useUIStore.getState();

    setBusy(true);
    logger.info("Service", "Iniciando instalação/atualização da integração...");
    try {
      const next = await api.installService();
      syncState(next);
      setIntegrationRequired(false);
      notify("success", getTranslation("message.integrationConfigured"));
      logger.info("Service", "Integração configurada com sucesso");
    } catch (error) {
      logger.error("Service", "Falha na instalação da integração", error);
      notify("error", formatSystemError(error));
    } finally {
      setBusy(false);
    }
  },

  toggleProfileEnabled: async (id: string) => {
    const { state, commit } = get();
    if (!state) return;
    const target = state.profiles.find((p) => p.id === id);
    if (!target) return;
    const nextEnabled = !target.enabled;
    const updatedProfiles = state.profiles.map((p) =>
      p.id === id ? { ...p, enabled: nextEnabled } : p,
    );
    logger.info("Profiles", `Alternando perfil '${target.name}' para enabled=${nextEnabled}`);
    await commit(
      { ...state, profiles: updatedProfiles },
      getTranslation("message.profileUpdated", { name: target.name }),
    );
  },

  createProfile: async (name: string, icon = "target", color = "blue") => {
    const { state, commit } = get();
    if (!state) return;
    const newId = `profile-${Date.now()}`;
    const newProfile: Profile = {
      id: newId,
      name: name.trim(),
      icon,
      color,
      enabled: true,
      domains: [],
      schedules: [],
    };
    const updatedProfiles = [...state.profiles, newProfile];
    set({ selectedProfileId: newId });
    logger.info("Profiles", `Criando novo perfil '${newProfile.name}' (id=${newId})`);
    await commit(
      { ...state, profiles: updatedProfiles },
      getTranslation("message.profileCreated", { name: newProfile.name }),
    );
  },

  updateProfile: async (id: string, updates: Partial<Profile>) => {
    const { state, commit } = get();
    if (!state) return;
    const target = state.profiles.find((p) => p.id === id);
    if (!target) return;
    const updatedProfiles = state.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
    const name = updates.name?.trim() || target.name;
    logger.info("Profiles", `Atualizando perfil '${name}'`);
    await commit(
      { ...state, profiles: updatedProfiles },
      getTranslation("message.profileUpdated", { name }),
    );
  },

  deleteProfile: async (id: string) => {
    const { state, selectedProfileId, commit } = get();
    if (!state) return;
    const { notify } = useUIStore.getState();

    if (state.profiles.length <= 1) {
      notify("warning", getTranslation("message.profileCannotDeleteLast"));
      return;
    }
    const updatedProfiles = state.profiles.filter((p) => p.id !== id);
    if (selectedProfileId === id) {
      set({ selectedProfileId: updatedProfiles[0].id });
    }
    logger.info("Profiles", `Excluindo perfil id=${id}`);
    await commit({ ...state, profiles: updatedProfiles }, getTranslation("message.profileDeleted"));
  },

  duplicateProfile: async (id: string) => {
    const { state, commit } = get();
    if (!state) return;
    const source = state.profiles.find((p) => p.id === id);
    if (!source) return;
    const newId = `${id}-copy-${Date.now()}`;
    const duplicate: Profile = {
      ...source,
      id: newId,
      name: `${source.name} (cópia)`,
    };
    const updatedProfiles = [...state.profiles, duplicate];
    set({ selectedProfileId: newId });
    logger.info("Profiles", `Duplicando perfil '${source.name}' para '${duplicate.name}'`);
    await commit(
      { ...state, profiles: updatedProfiles },
      getTranslation("message.profileCreated", { name: duplicate.name }),
    );
  },

  addDomain: async (candidate: string): Promise<boolean> => {
    const { state, getSelectedProfile, commit } = get();
    if (!state) return false;
    const { notify } = useUIStore.getState();

    const selectedProfile = getSelectedProfile();
    const currentDomains = selectedProfile ? selectedProfile.domains : state.domains;
    const validation = validateNewDomain(candidate, currentDomains);
    if (!validation.valid) {
      if (validation.error) notify("error", validation.error);
      logger.warn("Domains", `Tentativa de adicionar domínio inválido/duplicado: '${candidate}'`);
      return false;
    }
    logger.info("Domains", `Adicionando domínio: '${validation.sanitized}'`);

    if (selectedProfile) {
      const updatedProfiles = state.profiles.map((p) =>
        p.id === selectedProfile.id ? { ...p, domains: [...p.domains, validation.sanitized] } : p,
      );
      await commit(
        { ...state, profiles: updatedProfiles },
        getTranslation("message.domainAdded", { domain: validation.sanitized }),
      );
    } else {
      await commit(
        { ...state, domains: [...state.domains, validation.sanitized] },
        getTranslation("message.domainAdded", { domain: validation.sanitized }),
      );
    }
    return true;
  },

  removeDomain: async (domain: string) => {
    const { state, getSelectedProfile, commit } = get();
    if (!state) return;
    const selectedProfile = getSelectedProfile();
    logger.info("Domains", `Removendo domínio: '${domain}'`);

    if (selectedProfile) {
      const updatedProfiles = state.profiles.map((p) =>
        p.id === selectedProfile.id
          ? { ...p, domains: p.domains.filter((d) => d !== domain) }
          : p,
      );
      await commit(
        { ...state, profiles: updatedProfiles },
        getTranslation("message.domainRemoved", { domain }),
      );
    } else {
      await commit(
        { ...state, domains: state.domains.filter((item) => item !== domain) },
        getTranslation("message.domainRemoved", { domain }),
      );
    }
  },

  updateLocalSchedules: (updater: (prev: Schedule[]) => Schedule[]) => {
    const { state, getSelectedProfile } = get();
    if (!state) return;
    const selectedProfile = getSelectedProfile();

    if (selectedProfile) {
      const updatedProfiles = state.profiles.map((p) =>
        p.id === selectedProfile.id ? { ...p, schedules: updater(p.schedules) } : p,
      );
      set({ state: { ...state, profiles: updatedProfiles } });
    } else {
      set({ state: { ...state, schedules: updater(state.schedules) } });
    }
  },

  saveSchedules: async (overrideSchedules?: Schedule[]) => {
    const { state, getSelectedProfile, commit } = get();
    if (!state) return;
    const selectedProfile = getSelectedProfile();

    let nextState = state;
    if (overrideSchedules && selectedProfile) {
      const updatedProfiles = state.profiles.map((p) =>
        p.id === selectedProfile.id ? { ...p, schedules: overrideSchedules } : p,
      );
      nextState = { ...state, profiles: updatedProfiles };
    }
    logger.info("Schedules", "Salvando agenda de horários...", {
      profile: selectedProfile?.name ?? "Global",
      schedulesCount: overrideSchedules?.length ?? selectedProfile?.schedules.length ?? 0,
    });
    await commit(nextState, getTranslation("message.scheduleUpdated"));
  },

  reset: () => {
    if (unlistenStateChanged) {
      unlistenStateChanged();
      unlistenStateChanged = null;
    }
    useUIStore.getState().reset();
    set({
      state: null,
      selectedProfileId: "",
      api: siteblockApi,
      initialized: false,
    });
  },
}));

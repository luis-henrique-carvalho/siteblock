import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_EMPTY_STATE } from "../constants/config";
import { siteblockApi, type ISiteBlockApi } from "../services/siteblockApi";
import type { Schedule } from "../types/schedule";
import type { Profile, SiteBlockState } from "../types/siteblock";
import { validateNewDomain } from "../utils/domainValidator";
import { formatSystemError } from "../utils/errorFormatter";
import { logger } from "../utils/logger";
import { useLanguage } from "../i18n";

export interface UseSiteBlockOptions {
  api?: ISiteBlockApi;
}

export function useSiteBlock({ api = siteblockApi }: UseSiteBlockOptions = {}) {
  const { t } = useLanguage();
  const translation = useRef(t);
  const [state, setState] = useState<SiteBlockState | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [integrationRequired, setIntegrationRequired] = useState<boolean>(false);

  useEffect(() => {
    translation.current = t;
  }, [t]);

  // Se o perfil selecionado não existir mais ou não estiver definido, seleciona o primeiro disponível
  useEffect(() => {
    if (state?.profiles && state.profiles.length > 0) {
      if (!selectedProfileId || !state.profiles.some((p) => p.id === selectedProfileId)) {
        setSelectedProfileId(state.profiles[0].id);
      }
    }
  }, [state?.profiles, selectedProfileId]);

  useEffect(() => {
    let mounted = true;
    let initialState: SiteBlockState | null = null;
    logger.info("State", "Iniciando carregamento do estado do SiteBlock...");

    void api
      .getStatus()
      .then((nextState) => {
        initialState = nextState;
        logger.debug("State", "Status inicial obtido", nextState);
        if (
          nextState.helperInstalled &&
          (!nextState.sessionSupported || nextState.helperOutdated)
        ) {
          if (mounted) {
            setIntegrationRequired(true);
            setMessage(translation.current("message.integrationUpdate"));
            logger.warn("Service", "Integração precisa ser atualizada (helperOutdated=true)");
          }
        }
        return nextState.helperInstalled ? api.startPrivilegedSession() : nextState;
      })
      .then((nextState) => {
        if (mounted) {
          setState(nextState);
          if (nextState.helperOutdated) {
            setIntegrationRequired(true);
            setMessage(translation.current("message.integrationUpdate"));
          }
          logger.info("State", "Estado carregado com sucesso", {
            active: nextState.active,
            enabled: nextState.enabled,
            profilesCount: nextState.profiles?.length ?? 0,
            helperInstalled: nextState.helperInstalled,
          });
        }
      })
      .catch((error) => {
        if (!mounted) return;
        logger.error("State", "Falha ao carregar estado inicial", error);
        setState(initialState ?? INITIAL_EMPTY_STATE);
        if (initialState?.helperInstalled) {
          setIntegrationRequired(true);
          setMessage(translation.current("message.integrationUpdate"));
        } else {
          setMessage(formatSystemError(error));
        }
      });

    return () => {
      mounted = false;
    };
  }, [api]);

  useEffect(() => {
    if (!api.onStateChanged) return;
    let mounted = true;
    let cleanupFn: (() => void) | null = null;

    logger.info("State", "Registrando listener para siteblock://state-changed");
    void Promise.resolve(
      api.onStateChanged((newState) => {
        if (!mounted) return;
        logger.info("State", "Estado sincronizado via evento externo", {
          active: newState.active,
          enabled: newState.enabled,
          profilesCount: newState.profiles?.length ?? 0,
        });
        setState(newState);
      }),
    ).then((unlisten) => {
      if (!mounted) {
        if (typeof unlisten === "function") unlisten();
      } else {
        cleanupFn = unlisten;
      }
    });

    return () => {
      mounted = false;
      if (cleanupFn) cleanupFn();
    };
  }, [api]);

  const selectedProfile = useMemo(() => {
    if (!state?.profiles || state.profiles.length === 0) return null;
    return state.profiles.find((p) => p.id === selectedProfileId) ?? state.profiles[0];
  }, [state?.profiles, selectedProfileId]);

  const commit = useCallback(
    async (next: SiteBlockState, successMessage: string) => {
      setBusy(true);
      setMessage("");
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
        setState(saved);
        if (saved.helperOutdated) {
          setIntegrationRequired(true);
        }
        setMessage(successMessage);
        logger.info("Config", "Configuração salva com sucesso", { revision: saved.revision });
      } catch (error) {
        logger.error("Config", "Erro ao salvar configuração", error);
        setMessage(formatSystemError(error));
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  const toggleEnabled = useCallback(async () => {
    if (!state) return;
    const nextEnabled = !state.enabled;
    logger.info("Protection", `Alternando bloqueio mestre para: ${nextEnabled}`);
    await commit(
      { ...state, enabled: nextEnabled },
      nextEnabled ? t("message.blockingEnabled") : t("message.blockingDisabled"),
    );
  }, [state, commit, t]);

  const setBrowserEnabled = useCallback(
    async (browser: string, enabled: boolean) => {
      if (!state) return;
      const enabledBrowsers = enabled
        ? Array.from(new Set([...state.enabledBrowsers, browser]))
        : state.enabledBrowsers.filter((item) => item !== browser);
      await commit({ ...state, enabledBrowsers }, t("message.browserSettingsUpdated"));
    },
    [state, commit, t],
  );

  const installService = useCallback(async () => {
    setBusy(true);
    setMessage("");
    logger.info("Service", "Iniciando instalação/atualização da integração...");
    try {
      const next = await api.installService();
      setState(next);
      setIntegrationRequired(false);
      setMessage(t("message.integrationConfigured"));
      logger.info("Service", "Integração configurada com sucesso");
    } catch (error) {
      logger.error("Service", "Falha na instalação da integração", error);
      setMessage(formatSystemError(error));
    } finally {
      setBusy(false);
    }
  }, [api, t]);

  const selectProfile = useCallback((id: string) => {
    setSelectedProfileId(id);
  }, []);

  const toggleProfileEnabled = useCallback(
    async (id: string) => {
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
        t("message.profileUpdated", { name: target.name }),
      );
    },
    [state, commit, t],
  );

  const createProfile = useCallback(
    async (name: string, icon = "target", color = "blue") => {
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
      setSelectedProfileId(newId);
      logger.info("Profiles", `Criando novo perfil '${newProfile.name}' (id=${newId})`);
      await commit(
        { ...state, profiles: updatedProfiles },
        t("message.profileCreated", { name: newProfile.name }),
      );
    },
    [state, commit, t],
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<Profile>) => {
      if (!state) return;
      const target = state.profiles.find((p) => p.id === id);
      if (!target) return;
      const updatedProfiles = state.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const name = updates.name?.trim() || target.name;
      logger.info("Profiles", `Atualizando perfil '${name}'`);
      await commit({ ...state, profiles: updatedProfiles }, t("message.profileUpdated", { name }));
    },
    [state, commit, t],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      if (!state) return;
      if (state.profiles.length <= 1) {
        setMessage(t("message.profileCannotDeleteLast"));
        return;
      }
      const updatedProfiles = state.profiles.filter((p) => p.id !== id);
      if (selectedProfileId === id) {
        setSelectedProfileId(updatedProfiles[0].id);
      }
      logger.info("Profiles", `Excluindo perfil id=${id}`);
      await commit({ ...state, profiles: updatedProfiles }, t("message.profileDeleted"));
    },
    [state, selectedProfileId, commit, t],
  );

  const duplicateProfile = useCallback(
    async (id: string) => {
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
      setSelectedProfileId(newId);
      logger.info("Profiles", `Duplicando perfil '${source.name}' para '${duplicate.name}'`);
      await commit(
        { ...state, profiles: updatedProfiles },
        t("message.profileCreated", { name: duplicate.name }),
      );
    },
    [state, commit, t],
  );

  const addDomain = useCallback(
    async (candidate: string): Promise<boolean> => {
      if (!state) return false;
      const currentDomains = selectedProfile ? selectedProfile.domains : state.domains;
      const validation = validateNewDomain(candidate, currentDomains);
      if (!validation.valid) {
        if (validation.error) setMessage(validation.error);
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
          t("message.domainAdded", { domain: validation.sanitized }),
        );
      } else {
        await commit(
          { ...state, domains: [...state.domains, validation.sanitized] },
          t("message.domainAdded", { domain: validation.sanitized }),
        );
      }
      return true;
    },
    [state, selectedProfile, commit, t],
  );

  const removeDomain = useCallback(
    async (domain: string) => {
      if (!state) return;
      logger.info("Domains", `Removendo domínio: '${domain}'`);

      if (selectedProfile) {
        const updatedProfiles = state.profiles.map((p) =>
          p.id === selectedProfile.id
            ? { ...p, domains: p.domains.filter((d) => d !== domain) }
            : p,
        );
        await commit(
          { ...state, profiles: updatedProfiles },
          t("message.domainRemoved", { domain }),
        );
      } else {
        await commit(
          { ...state, domains: state.domains.filter((item) => item !== domain) },
          t("message.domainRemoved", { domain }),
        );
      }
    },
    [state, selectedProfile, commit, t],
  );

  const updateLocalSchedules = useCallback(
    (updater: (prev: Schedule[]) => Schedule[]) => {
      if (!state) return;
      if (selectedProfile) {
        setState((prev) => {
          if (!prev) return null;
          const updatedProfiles = prev.profiles.map((p) =>
            p.id === selectedProfile.id ? { ...p, schedules: updater(p.schedules) } : p,
          );
          return { ...prev, profiles: updatedProfiles };
        });
      } else {
        setState((prev) => (prev ? { ...prev, schedules: updater(prev.schedules) } : null));
      }
    },
    [state, selectedProfile],
  );

  const saveSchedules = useCallback(
    async (overrideSchedules?: Schedule[]) => {
      if (!state) return;
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
      await commit(nextState, t("message.scheduleUpdated"));
    },
    [state, selectedProfile, commit, t],
  );

  return {
    state,
    selectedProfile,
    selectedProfileId,
    message,
    busy,
    integrationRequired,
    setMessage,
    toggleEnabled,
    setBrowserEnabled,
    installService,
    selectProfile,
    toggleProfileEnabled,
    createProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
    addDomain,
    removeDomain,
    updateLocalSchedules,
    saveSchedules,
  };
}

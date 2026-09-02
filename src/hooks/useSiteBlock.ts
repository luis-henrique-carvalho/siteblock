import { useCallback, useEffect, useState } from "react";
import { INITIAL_EMPTY_STATE } from "../constants/config";
import { siteblockApi, type ISiteBlockApi } from "../services/siteblockApi";
import type { Schedule } from "../types/schedule";
import type { SiteBlockState } from "../types/siteblock";
import { validateNewDomain } from "../utils/domainValidator";
import { formatSystemError } from "../utils/errorFormatter";
import { logger } from "../utils/logger";

export interface UseSiteBlockOptions {
  api?: ISiteBlockApi;
}

export function useSiteBlock({ api = siteblockApi }: UseSiteBlockOptions = {}) {
  const [state, setState] = useState<SiteBlockState | null>(null);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [integrationRequired, setIntegrationRequired] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    let initialState: SiteBlockState | null = null;
    logger.info("Hook", "Iniciando carregamento do estado do SiteBlock...");

    void api
      .getStatus()
      .then((nextState) => {
        initialState = nextState;
        logger.debug("Hook", "Status inicial obtido", nextState);
        if (nextState.helperInstalled && !nextState.sessionSupported) {
          if (mounted) {
            setIntegrationRequired(true);
            setMessage("A integração do SiteBlock precisa ser atualizada uma vez.");
            logger.warn("Hook", "Integração precisa ser atualizada (sessionSupported=false)");
          }
          return nextState;
        }
        return nextState.helperInstalled ? api.startPrivilegedSession() : nextState;
      })
      .then((nextState) => {
        if (mounted) {
          setState(nextState);
          logger.info("Hook", "Estado carregado com sucesso", {
            active: nextState.active,
            enabled: nextState.enabled,
            helperInstalled: nextState.helperInstalled,
          });
        }
      })
      .catch((error) => {
        if (!mounted) return;
        logger.error("Hook", "Falha ao carregar estado inicial", error);
        setState(initialState ?? INITIAL_EMPTY_STATE);
        if (initialState?.helperInstalled) {
          setIntegrationRequired(true);
          setMessage("A integração do SiteBlock precisa ser atualizada uma vez.");
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

    logger.info("Hook", "Registrando listener para siteblock://state-changed");
    void Promise.resolve(
      api.onStateChanged((newState) => {
        if (!mounted) return;
        logger.info("Hook", "Estado sincronizado via evento externo", {
          active: newState.active,
          enabled: newState.enabled,
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

  const commit = useCallback(
    async (next: SiteBlockState, successMessage: string) => {
      setBusy(true);
      setMessage("");
      logger.info("Hook", "Salvando configuração...", {
        enabled: next.enabled,
        domains: next.domains,
        schedulesCount: next.schedules.length,
      });
      try {
        const saved = await api.saveConfig({
          enabled: next.enabled,
          domains: next.domains,
          schedules: next.schedules,
        });
        setState(saved);
        setMessage(successMessage);
        logger.info("Hook", "Configuração salva com sucesso", { revision: saved.revision });
      } catch (error) {
        logger.error("Hook", "Erro ao salvar configuração", error);
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
    logger.info("Hook", `Alternando bloqueio mestre para: ${nextEnabled}`);
    await commit(
      { ...state, enabled: nextEnabled },
      nextEnabled ? "Bloqueio ativado." : "Bloqueio desativado.",
    );
  }, [state, commit]);

  const installService = useCallback(async () => {
    setBusy(true);
    setMessage("");
    logger.info("Hook", "Iniciando instalação/atualização da integração...");
    try {
      const next = await api.installService();
      setState(next);
      setIntegrationRequired(false);
      setMessage(
        "Integração configurada. Reinicie o Chrome ou Brave uma única vez para carregar a extensão; depois, use somente esta interface.",
      );
      logger.info("Hook", "Integração configurada com sucesso");
    } catch (error) {
      logger.error("Hook", "Falha na instalação da integração", error);
      setMessage(formatSystemError(error));
    } finally {
      setBusy(false);
    }
  }, [api]);

  const addDomain = useCallback(
    async (candidate: string): Promise<boolean> => {
      if (!state) return false;
      const validation = validateNewDomain(candidate, state.domains);
      if (!validation.valid) {
        if (validation.error) setMessage(validation.error);
        logger.warn("Hook", `Tentativa de adicionar domínio inválido/duplicado: '${candidate}'`);
        return false;
      }
      logger.info("Hook", `Adicionando domínio: '${validation.sanitized}'`);
      await commit(
        { ...state, domains: [...state.domains, validation.sanitized] },
        `${validation.sanitized} adicionado.`,
      );
      return true;
    },
    [state, commit],
  );

  const removeDomain = useCallback(
    async (domain: string) => {
      if (!state) return;
      logger.info("Hook", `Removendo domínio: '${domain}'`);
      await commit(
        { ...state, domains: state.domains.filter((item) => item !== domain) },
        `${domain} removido.`,
      );
    },
    [state, commit],
  );

  const updateLocalSchedules = useCallback(
    (updater: (prev: Schedule[]) => Schedule[]) => {
      if (!state) return;
      setState((prev) => (prev ? { ...prev, schedules: updater(prev.schedules) } : null));
    },
    [state],
  );

  const saveSchedules = useCallback(async () => {
    if (!state) return;
    await commit(state, "Agenda atualizada.");
  }, [state, commit]);

  return {
    state,
    message,
    busy,
    integrationRequired,
    setMessage,
    toggleEnabled,
    installService,
    addDomain,
    removeDomain,
    updateLocalSchedules,
    saveSchedules,
  };
}

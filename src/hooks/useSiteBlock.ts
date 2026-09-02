import { useCallback, useEffect, useState } from "react";
import { INITIAL_EMPTY_STATE } from "../constants/config";
import { siteblockApi, type ISiteBlockApi } from "../services/siteblockApi";
import type { Schedule } from "../types/schedule";
import type { SiteBlockState } from "../types/siteblock";
import { validateNewDomain } from "../utils/domainValidator";
import { formatSystemError } from "../utils/errorFormatter";

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

    void api
      .getStatus()
      .then((nextState) => {
        initialState = nextState;
        if (nextState.helperInstalled && !nextState.sessionSupported) {
          if (mounted) {
            setIntegrationRequired(true);
            setMessage("A integração do SiteBlock precisa ser atualizada uma vez.");
          }
          return nextState;
        }
        return nextState.helperInstalled ? api.startPrivilegedSession() : nextState;
      })
      .then((nextState) => {
        if (mounted) {
          setState(nextState);
        }
      })
      .catch((error) => {
        if (!mounted) return;
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

  const commit = useCallback(
    async (next: SiteBlockState, successMessage: string) => {
      setBusy(true);
      setMessage("");
      try {
        const saved = await api.saveConfig({
          enabled: next.enabled,
          domains: next.domains,
          schedules: next.schedules,
        });
        setState(saved);
        setMessage(successMessage);
      } catch (error) {
        setMessage(formatSystemError(error));
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  const toggleEnabled = useCallback(async () => {
    if (!state) return;
    await commit(
      { ...state, enabled: !state.enabled },
      !state.enabled ? "Bloqueio ativado." : "Bloqueio desativado.",
    );
  }, [state, commit]);

  const installService = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const next = await api.installService();
      setState(next);
      setIntegrationRequired(false);
      setMessage(
        "Integração configurada. Reinicie o Chrome ou Brave uma única vez para carregar a extensão; depois, use somente esta interface.",
      );
    } catch (error) {
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
        return false;
      }
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

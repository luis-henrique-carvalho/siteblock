import { useEffect } from "react";
import { siteblockApi, type ISiteBlockApi } from "../services/siteblockApi";
import { useSiteBlockStore } from "../stores/useSiteBlockStore";
import { useUIStore } from "../stores/useUIStore";

export interface UseSiteBlockOptions {
  api?: ISiteBlockApi;
}

export function useSiteBlock({ api = siteblockApi }: UseSiteBlockOptions = {}) {
  const state = useSiteBlockStore((s) => s.state);
  const selectedProfileId = useSiteBlockStore((s) => s.selectedProfileId);
  const selectedProfile = useSiteBlockStore((s) => {
    if (!s.state?.profiles || s.state.profiles.length === 0) return null;
    return s.state.profiles.find((p) => p.id === s.selectedProfileId) ?? s.state.profiles[0];
  });

  const busy = useUIStore((s) => s.busy);
  const message = useUIStore((s) => s.message);
  const integrationRequired = useUIStore((s) => s.integrationRequired);
  const setMessage = useUIStore((s) => s.setMessage);

  const toggleEnabled = useSiteBlockStore((s) => s.toggleEnabled);
  const setBrowserEnabled = useSiteBlockStore((s) => s.setBrowserEnabled);
  const installService = useSiteBlockStore((s) => s.installService);
  const selectProfile = useSiteBlockStore((s) => s.selectProfile);
  const toggleProfileEnabled = useSiteBlockStore((s) => s.toggleProfileEnabled);
  const createProfile = useSiteBlockStore((s) => s.createProfile);
  const updateProfile = useSiteBlockStore((s) => s.updateProfile);
  const deleteProfile = useSiteBlockStore((s) => s.deleteProfile);
  const duplicateProfile = useSiteBlockStore((s) => s.duplicateProfile);
  const addDomain = useSiteBlockStore((s) => s.addDomain);
  const removeDomain = useSiteBlockStore((s) => s.removeDomain);
  const updateLocalSchedules = useSiteBlockStore((s) => s.updateLocalSchedules);
  const saveSchedules = useSiteBlockStore((s) => s.saveSchedules);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    void useSiteBlockStore.getState().init(api).then((cleanup) => {
      if (!mounted) {
        cleanup?.();
      } else {
        unlisten = cleanup;
      }
    });

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [api]);

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

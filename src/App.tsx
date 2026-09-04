import { useEffect, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSiteBlock } from "./hooks/useSiteBlock";
import { useUIStore } from "./stores";
import { getScheduleSummary } from "./utils/scheduleHelpers";
import { TopBar } from "./components/layout/TopBar";
import { Footer } from "./components/layout/Footer";
import { SetupBanner } from "./components/setup/SetupBanner";
import { BrowserStatusList } from "./components/browser/BrowserStatusList";
import { HeroSection } from "./components/hero/HeroSection";
import { MasterSwitch } from "./components/controls/MasterSwitch";
import { ProfileTabs } from "./components/profiles/ProfileTabs";
import { DomainManager } from "./components/domains/DomainManager";
import { ScheduleManager } from "./components/schedules/ScheduleManager";
import { LoadingScreen } from "./components/common/LoadingScreen";
import { PreferencesPanel } from "./components/preferences/PreferencesPanel";
import { AboutDialog } from "./components/preferences/AboutDialog";
import { FocusStatisticsPanel } from "./components/statistics/FocusStatisticsPanel";
import { siteblockApi } from "./services/siteblockApi";
import { LanguageProvider, useLanguage } from "./i18n";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import "./App.css";

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
      <Toaster richColors position="bottom-right" />
    </LanguageProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const preferencesOpen = useUIStore((s) => s.preferencesOpen);
  const aboutOpen = useUIStore((s) => s.aboutOpen);
  const setPreferencesOpen = useUIStore((s) => s.setPreferencesOpen);
  const setAboutOpen = useUIStore((s) => s.setAboutOpen);
  const {
    state,
    selectedProfile,
    selectedProfileId,
    message,
    busy,
    integrationRequired,
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
  } = useSiteBlock();

  const activeProfilesNames = useMemo(() => {
    if (!state?.profiles || !state.activeProfileIds) return [];
    return state.profiles.filter((p) => state.activeProfileIds.includes(p.id)).map((p) => p.name);
  }, [state?.profiles, state?.activeProfileIds]);

  const scheduleSummary = useMemo(
    () => getScheduleSummary(selectedProfile?.schedules.length ?? state?.schedules.length ?? 0, t),
    [selectedProfile?.schedules.length, state?.schedules.length, t],
  );

  useEffect(() => {
    let mounted = true;
    let unlistenPreferences: (() => void) | undefined;
    let unlistenAbout: (() => void) | undefined;

    void Promise.all([
      listen("siteblock://open-preferences", () => useUIStore.getState().setPreferencesOpen(true)),
      listen("siteblock://open-about", () => useUIStore.getState().setAboutOpen(true)),
    ]).then(([preferencesCleanup, aboutCleanup]) => {
      if (mounted) {
        unlistenPreferences = preferencesCleanup;
        unlistenAbout = aboutCleanup;
      } else {
        preferencesCleanup();
        aboutCleanup();
      }
    });

    return () => {
      mounted = false;
      unlistenPreferences?.();
      unlistenAbout?.();
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const lower = message.toLowerCase();
    const isError =
      lower.includes("erro") ||
      lower.includes("falha") ||
      lower.includes("inválido") ||
      lower.startsWith("informe") ||
      lower.includes("não é possível") ||
      lower.includes("cancelada");

    const isWarning = lower.includes("atualizada") || lower.includes("atenção");

    if (isError) {
      toast.error(message);
    } else if (isWarning) {
      toast.warning(message);
    } else {
      toast.success(message);
    }
  }, [message]);

  if (!state) {
    return <LoadingScreen />;
  }

  const isActionsDisabled = busy || !state.helperInstalled;
  const currentDomains = selectedProfile ? selectedProfile.domains : state.domains;
  const currentSchedules = selectedProfile ? selectedProfile.schedules : state.schedules;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors">
      <main className="app-shell animate-in fade-in duration-300">
        <TopBar active={state.active} onOpenPreferences={() => setPreferencesOpen(true)} />

        {(!state.helperInstalled || integrationRequired) && (
          <SetupBanner onInstall={() => void installService()} busy={busy} />
        )}

        <HeroSection
          active={state.active}
          enabled={state.enabled}
          scheduleSummary={scheduleSummary}
          activeProfilesNames={activeProfilesNames}
        />

        <MasterSwitch
          enabled={state.enabled}
          disabled={isActionsDisabled}
          onToggle={() => void toggleEnabled()}
        />

        {state.profiles && state.profiles.length > 0 && (
          <div className="my-4">
            <ProfileTabs
              profiles={state.profiles}
              selectedProfileId={selectedProfileId}
              activeProfileIds={state.activeProfileIds ?? []}
              masterEnabled={state.enabled}
              disabled={isActionsDisabled}
              onSelectProfile={selectProfile}
              onToggleProfile={(id) => void toggleProfileEnabled(id)}
              onCreateProfile={(name, icon, color) => void createProfile(name, icon, color)}
              onUpdateProfile={(id, updates) => void updateProfile(id, updates)}
              onDeleteProfile={(id) => void deleteProfile(id)}
              onDuplicateProfile={(id) => void duplicateProfile(id)}
            />
          </div>
        )}

        {state.helperInstalled && (
          <BrowserStatusList
            integrations={state.browserIntegrations}
            disabled={isActionsDisabled}
            onToggleBrowser={(browser, enabled) => void setBrowserEnabled(browser, enabled)}
            onOpenPreferences={() => setPreferencesOpen(true)}
          />
        )}

        <div className="content-grid">
          <DomainManager
            domains={currentDomains}
            disabled={isActionsDisabled}
            onAddDomain={addDomain}
            onRemoveDomain={(d) => void removeDomain(d)}
          />

          <ScheduleManager
            schedules={currentSchedules}
            disabled={isActionsDisabled}
            onUpdateSchedules={updateLocalSchedules}
            onSaveSchedules={(s) => void saveSchedules(s)}
          />
        </div>

        <FocusStatisticsPanel
          profiles={state.profiles ?? []}
          api={siteblockApi}
          available={state.helperInstalled && !integrationRequired}
        />

        <PreferencesPanel
          open={preferencesOpen}
          onOpenChange={setPreferencesOpen}
          browsers={state.browserIntegrations}
          disabled={isActionsDisabled || integrationRequired}
          onBrowserEnabledChange={(browser, enabled) => void setBrowserEnabled(browser, enabled)}
        />
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />

        <Footer />
      </main>
    </div>
  );
}

export default App;

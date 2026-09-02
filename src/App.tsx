import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSiteBlock } from "./hooks/useSiteBlock";
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
import { LanguageProvider, useLanguage } from "./i18n";
import "./App.css";

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const {
    state,
    selectedProfile,
    selectedProfileId,
    message,
    busy,
    integrationRequired,
    toggleEnabled,
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
    return state.profiles
      .filter((p) => state.activeProfileIds.includes(p.id))
      .map((p) => p.name);
  }, [state?.profiles, state?.activeProfileIds]);

  const scheduleSummary = useMemo(
    () =>
      getScheduleSummary(
        selectedProfile?.schedules.length ?? state?.schedules.length ?? 0,
        t,
      ),
    [selectedProfile?.schedules.length, state?.schedules.length, t],
  );

  useEffect(() => {
    let mounted = true;
    let unlistenPreferences: (() => void) | undefined;
    let unlistenAbout: (() => void) | undefined;

    void Promise.all([
      listen("siteblock://open-preferences", () => setPreferencesOpen(true)),
      listen("siteblock://open-about", () => setAboutOpen(true)),
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

  if (!state) {
    return <LoadingScreen />;
  }

  const isActionsDisabled = busy || !state.helperInstalled;
  const currentDomains = selectedProfile ? selectedProfile.domains : state.domains;
  const currentSchedules = selectedProfile ? selectedProfile.schedules : state.schedules;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors">
      <main className="app-shell animate-in fade-in duration-300">
        <TopBar active={state.active} />

        {(!state.helperInstalled || integrationRequired) && (
          <SetupBanner onInstall={() => void installService()} busy={busy} />
        )}

        {state.helperInstalled && <BrowserStatusList integrations={state.browserIntegrations} />}

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

        <div className="content-grid">
          <DomainManager
            domains={currentDomains}
            message={message}
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

        <PreferencesPanel open={preferencesOpen} onOpenChange={setPreferencesOpen} />
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />

        <Footer message={message} />
      </main>
    </div>
  );
}

export default App;

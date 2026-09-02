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
    message,
    busy,
    integrationRequired,
    toggleEnabled,
    installService,
    addDomain,
    removeDomain,
    updateLocalSchedules,
    saveSchedules,
  } = useSiteBlock();

  const scheduleSummary = useMemo(
    () => getScheduleSummary(state?.schedules.length ?? 0, t),
    [state?.schedules.length, t],
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
        />

        <MasterSwitch
          enabled={state.enabled}
          disabled={isActionsDisabled}
          onToggle={() => void toggleEnabled()}
        />

        <div className="content-grid">
          <DomainManager
            domains={state.domains}
            message={message}
            disabled={isActionsDisabled}
            onAddDomain={addDomain}
            onRemoveDomain={(d) => void removeDomain(d)}
          />

          <ScheduleManager
            schedules={state.schedules}
            disabled={isActionsDisabled}
            onUpdateSchedules={updateLocalSchedules}
            onSaveSchedules={() => void saveSchedules()}
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

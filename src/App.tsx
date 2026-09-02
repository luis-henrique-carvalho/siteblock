import { useMemo } from "react";
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
import "./App.css";

export function App() {
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
    () => getScheduleSummary(state?.schedules.length ?? 0),
    [state?.schedules.length],
  );

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

        <Footer message={message} />
      </main>
    </div>
  );
}

export default App;

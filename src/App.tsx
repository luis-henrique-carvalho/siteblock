import { useEffect, lazy, Suspense } from "react";
import { useSiteBlockStore, useUIStore } from "./stores";
import { TopBar } from "./components/layout/TopBar";
import { Footer } from "./components/layout/Footer";
import { SetupBanner } from "./components/setup/SetupBanner";
import { BrowserStatusList } from "@/features/browser";
import { HeroSection } from "./components/hero/HeroSection";
import { MasterSwitch } from "./components/controls/MasterSwitch";
import { ProfileTabs } from "@/features/profiles";
import { DomainManager } from "@/features/domains";
import { ScheduleManager } from "@/features/schedules";
import { LoadingScreen } from "./components/common/LoadingScreen";
import { siteblockApi } from "./services/siteblockApi";
import { LanguageProvider } from "./i18n";
import { Toaster } from "./components/ui/sonner";
import "./App.css";

const FocusStatisticsPanel = lazy(
  () => import("@/features/statistics"),
);
const PreferencesPanel = lazy(
  () => import("@/features/preferences").then((m) => ({ default: m.PreferencesPanel })),
);
const AboutDialog = lazy(
  () => import("@/features/preferences").then((m) => ({ default: m.AboutDialog })),
);

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
      <Toaster richColors position="bottom-right" />
    </LanguageProvider>
  );
}

function AppContent() {
  const state = useSiteBlockStore((s) => s.state);
  const installService = useSiteBlockStore((s) => s.installService);
  const busy = useUIStore((s) => s.busy);
  const integrationRequired = useUIStore((s) => s.integrationRequired);
  const preferencesOpen = useUIStore((s) => s.preferencesOpen);
  const aboutOpen = useUIStore((s) => s.aboutOpen);
  const init = useSiteBlockStore((s) => s.init);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    void init().then((cleanup) => {
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
  }, [init]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    if (siteblockApi.onOpenPreferences && siteblockApi.onOpenAbout) {
      Promise.all([
        siteblockApi.onOpenPreferences(() => {
          if (mounted) useUIStore.getState().setPreferencesOpen(true);
        }),
        siteblockApi.onOpenAbout(() => {
          if (mounted) useUIStore.getState().setAboutOpen(true);
        }),
      ]).then(([u1, u2]) => {
        if (!mounted) {
          u1();
          u2();
        } else {
          unlisten = () => {
            u1();
            u2();
          };
        }
      });
    }

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);

  if (!state) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors">
      <main className="app-shell animate-in fade-in duration-300">
        <TopBar />

        {(!state.helperInstalled || integrationRequired) && (
          <SetupBanner onInstall={() => void installService()} busy={busy} />
        )}

        <HeroSection />

        <MasterSwitch />

        {state.profiles && state.profiles.length > 0 && (
          <div className="my-4">
            <ProfileTabs />
          </div>
        )}

        {state.helperInstalled && <BrowserStatusList />}

        <div className="content-grid">
          <DomainManager />
          <ScheduleManager />
        </div>

        <Suspense fallback={null}>
          <FocusStatisticsPanel />
          {preferencesOpen && <PreferencesPanel />}
          {aboutOpen && <AboutDialog />}
        </Suspense>

        <Footer />
      </main>
    </div>
  );
}

export default App;

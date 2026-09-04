import { useEffect, lazy, Suspense } from "react";
import { useSiteBlockStore, useUIStore } from "./stores";
import { TopBar } from "./components/layout/TopBar";
import { SetupBanner } from "./components/setup/SetupBanner";
import { BrowserStatusList } from "@/features/browser";
import { MasterSwitch } from "./components/controls/MasterSwitch";
import { ProfileTabs } from "@/features/profiles";
import { DomainManager } from "@/features/domains";
import { ScheduleManager } from "@/features/schedules";
import { LoadingScreen } from "./components/common/LoadingScreen";
import { siteblockApi } from "./services/siteblockApi";
import { LanguageProvider, useLanguage } from "./i18n";
import { Toaster } from "./components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Shield, BarChart3 } from "lucide-react";
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
  const { t } = useLanguage();
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
    <div className="min-h-screen bg-background text-foreground selection:bg-muted selection:text-foreground transition-colors">
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
        <TopBar />

        {(!state.helperInstalled || integrationRequired) && (
          <SetupBanner onInstall={() => void installService()} busy={busy} />
        )}

        <MasterSwitch />

        <Tabs defaultValue="focus" className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-xs h-9">
            <TabsTrigger value="focus" className="gap-2 text-xs font-medium">
              <Shield className="size-3.5" />
              {t("nav.focus")}
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-2 text-xs font-medium">
              <BarChart3 className="size-3.5" />
              {t("nav.statistics")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="focus" className="space-y-4 focus-visible:outline-none mt-0">
            {state.profiles && state.profiles.length > 0 && (
              <ProfileTabs />
            )}

            {state.helperInstalled && <BrowserStatusList />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DomainManager />
              <ScheduleManager />
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="focus-visible:outline-none mt-0">
            <Suspense fallback={<div className="py-8 text-center text-xs text-muted-foreground">{t("app.loading")}</div>}>
              <FocusStatisticsPanel />
            </Suspense>
          </TabsContent>
        </Tabs>

        <Suspense fallback={null}>
          {preferencesOpen && <PreferencesPanel />}
          {aboutOpen && <AboutDialog />}
        </Suspense>
      </main>
    </div>
  );
}

export default App;

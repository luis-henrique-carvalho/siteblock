import { useState } from "react";
import type { BrowserIntegration } from "@/types/siteblock";
import { BrowserItem } from "./BrowserItem";
import { BrowserRestartDialog } from "./BrowserRestartDialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Settings2 } from "lucide-react";
import { useLanguage } from "@/i18n";
import { useSiteBlockStore, useUIStore } from "@/stores";

interface BrowserStatusListProps {
  integrations?: BrowserIntegration[];
  disabled?: boolean;
  onToggleBrowser?: (browser: string, enabled: boolean) => void;
  onOpenPreferences?: () => void;
}

const EMPTY_INTEGRATIONS: BrowserIntegration[] = [];

export function BrowserStatusList({
  integrations: propIntegrations,
  disabled: propDisabled,
  onToggleBrowser: propOnToggleBrowser,
  onOpenPreferences: propOnOpenPreferences,
}: BrowserStatusListProps = {}) {
  const { t } = useLanguage();
  const storeIntegrations = useSiteBlockStore(
    (s) => s.state?.browserIntegrations ?? EMPTY_INTEGRATIONS,
  );
  const setBrowserEnabled = useSiteBlockStore((s) => s.setBrowserEnabled);
  const setPreferencesOpen = useUIStore((s) => s.setPreferencesOpen);
  const busy = useUIStore((s) => s.busy);
  const helperInstalled = useSiteBlockStore((s) => s.state?.helperInstalled ?? true);

  const integrations = propIntegrations ?? storeIntegrations;
  const disabled = propDisabled ?? (busy || !helperInstalled);
  const onToggleBrowser =
    propOnToggleBrowser ?? ((b, enabled) => void setBrowserEnabled(b, enabled));
  const onOpenPreferences =
    propOnOpenPreferences ?? (() => setPreferencesOpen(true));

  const [restartTargetBrowser, setRestartTargetBrowser] = useState<string | null>(null);

  const handleToggle = (name: string, enabled: boolean) => {
    onToggleBrowser?.(name, enabled);
    if (enabled) {
      const target = integrations.find((b) => b.name === name);
      if (target?.requiresRestart) {
        setRestartTargetBrowser(name);
      }
    }
  };

  return (
    <Card
      className="border border-border bg-card shadow-xs"
      aria-label={t("browser.label")}
    >
      <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-xs font-semibold text-foreground">
            {t("browser.label")}
          </CardTitle>
        </div>

        {onOpenPreferences && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenPreferences}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 font-normal"
          >
            <Settings2 className="size-3" aria-hidden="true" />
            <span>{t("browser.configure")}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-3.5 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map((browser) => (
            <BrowserItem
              key={browser.name}
              browser={browser}
              disabled={disabled}
              onToggle={handleToggle}
            />
          ))}
          {integrations.length === 0 && (
            <div className="col-span-full py-5 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl bg-card/20">
              {t("browser.empty")}
            </div>
          )}
        </div>
      </CardContent>

      <BrowserRestartDialog
        open={restartTargetBrowser !== null}
        onOpenChange={(open) => {
          if (!open) setRestartTargetBrowser(null);
        }}
        browserName={restartTargetBrowser ?? ""}
      />
    </Card>
  );
}

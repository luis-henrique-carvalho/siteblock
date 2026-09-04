import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, BadgeCheck, Globe, Languages } from "lucide-react";
import { LANGUAGES, type Language, useLanguage } from "@/i18n";
import type { BrowserIntegration } from "@/types/siteblock";

const languageNames: Record<Language, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

import { useSiteBlockStore } from "@/stores/useSiteBlockStore";
import { useUIStore } from "@/stores/useUIStore";

interface PreferencesPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  browsers?: BrowserIntegration[];
  disabled?: boolean;
  onBrowserEnabledChange?: (browser: string, enabled: boolean) => void;
}

const EMPTY_INTEGRATIONS: BrowserIntegration[] = [];

export function PreferencesPanel({
  open: propOpen,
  onOpenChange: propOnOpenChange,
  browsers: propBrowsers,
  disabled: propDisabled,
  onBrowserEnabledChange: propOnBrowserEnabledChange,
}: PreferencesPanelProps = {}) {
  const storeOpen = useUIStore((s) => s.preferencesOpen);
  const storeSetOpen = useUIStore((s) => s.setPreferencesOpen);
  const storeBrowsers = useSiteBlockStore(
    (s) => s.state?.browserIntegrations ?? EMPTY_INTEGRATIONS,
  );
  const setBrowserEnabled = useSiteBlockStore((s) => s.setBrowserEnabled);
  const busy = useUIStore((s) => s.busy);
  const helperInstalled = useSiteBlockStore((s) => s.state?.helperInstalled ?? true);
  const integrationRequired = useUIStore((s) => s.integrationRequired);

  const open = propOpen ?? storeOpen;
  const onOpenChange = propOnOpenChange ?? storeSetOpen;
  const browsers = propBrowsers ?? storeBrowsers;
  const disabled = propDisabled ?? (busy || !helperInstalled || integrationRequired);
  const onBrowserEnabledChange =
    propOnBrowserEnabledChange ?? ((b, en) => void setBrowserEnabled(b, en));
  const { hasPersistenceError, language, setLanguage, t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-background p-0 shadow-lg sm:max-w-lg">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            {t("preferences.title")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("preferences.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                <Languages className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {t("preferences.language")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("preferences.languageDescription")}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-border/60 pt-3">
              <NativeSelect
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                aria-label={t("preferences.language")}
                className="w-full text-xs h-8"
              >
                {LANGUAGES.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {languageNames[option]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <span
                className={
                  hasPersistenceError
                    ? "mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive"
                    : "mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                }
              >
                {hasPersistenceError ? (
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                ) : (
                  <BadgeCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
                )}
                {t(hasPersistenceError ? "preferences.saveError" : "preferences.saved")}
              </span>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                <Globe className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {t("preferences.browsers")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("preferences.browsersDescription")}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
              {browsers.map((browser) => (
                <label
                  key={browser.name}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border/60 p-2.5 transition-colors hover:bg-muted/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                >
                  <span>
                    <span className="block text-xs font-medium text-foreground">
                      {browser.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {browser.detected
                        ? t("preferences.browserDetected")
                        : t("preferences.browserNotDetected")}
                    </span>
                  </span>
                  <Checkbox
                    checked={browser.enabled}
                    disabled={disabled}
                    aria-label={t("preferences.browserToggle", { browser: browser.name })}
                    onCheckedChange={(checked) =>
                      onBrowserEnabledChange?.(browser.name, checked === true)
                    }
                  />
                </label>
              ))}
              {browsers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("preferences.browserSetupRequired")}
                </p>
              )}
            </div>
          </section>
        </div>

        <DialogFooter
          className="border-t border-border bg-muted/20 px-5 py-3"
          showCloseButton={false}
        >
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              {t("preferences.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PreferencesPanel;

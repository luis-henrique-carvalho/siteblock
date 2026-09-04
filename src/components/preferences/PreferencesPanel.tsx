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
import { AlertCircle, BadgeCheck, Globe, Languages, MonitorCog } from "lucide-react";
import { LANGUAGES, type Language, useLanguage } from "../../i18n";
import type { BrowserIntegration } from "../../types/siteblock";

const languageNames: Record<Language, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

import { useSiteBlockStore, useUIStore } from "@/stores";

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
      <DialogContent className="gap-0 overflow-hidden border-border/80 bg-popover p-0 shadow-2xl sm:max-w-xl">
        <DialogHeader className="relative gap-3 overflow-hidden border-b border-border/70 bg-gradient-to-br from-primary/[0.09] via-popover to-popover px-7 pt-7 pb-6 pr-14">
          <div
            className="absolute -top-12 -right-10 size-40 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2 text-[11px] font-mono font-bold tracking-[0.15em] text-primary uppercase">
            <MonitorCog className="size-3.5" aria-hidden="true" />
            <span>{t("preferences.eyebrow")}</span>
          </div>
          <DialogTitle className="relative text-2xl font-bold tracking-tight text-foreground">
            {t("preferences.title")}
          </DialogTitle>
          <DialogDescription className="relative max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("preferences.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 py-6">
          <section className="rounded-xl border border-border/80 bg-background/45 p-5 shadow-inner shadow-black/5">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-sm">
                <Languages className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {t("preferences.language")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("preferences.languageDescription")}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-border/70 pt-4">
              <NativeSelect
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                aria-label={t("preferences.language")}
                className="w-full"
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
                    ? "mt-3 flex items-center gap-1.5 text-xs font-medium text-destructive"
                    : "mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                }
              >
                {hasPersistenceError ? (
                  <AlertCircle className="size-4" aria-hidden="true" />
                ) : (
                  <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
                )}
                {t(hasPersistenceError ? "preferences.saveError" : "preferences.saved")}
              </span>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-border/80 bg-background/45 p-5 shadow-inner shadow-black/5">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-sm">
                <Globe className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {t("preferences.browsers")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("preferences.browsersDescription")}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-border/70 pt-4">
              {browsers.map((browser) => (
                <label
                  key={browser.name}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-2.5 transition-colors hover:bg-muted/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      {browser.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
                  {t("preferences.browserSetupRequired")}
                </p>
              )}
            </div>
          </section>
        </div>

        <DialogFooter
          className="-mx-0 -mb-0 border-border/70 bg-muted/30 px-7 py-4"
          showCloseButton={false}
        >
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-w-24 font-semibold">
              {t("preferences.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PreferencesPanel;

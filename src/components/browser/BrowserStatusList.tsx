import type { BrowserIntegration } from "../../types/siteblock";
import { BrowserItem } from "./BrowserItem";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Settings2 } from "lucide-react";
import { useLanguage } from "../../i18n";

interface BrowserStatusListProps {
  integrations: BrowserIntegration[];
  disabled?: boolean;
  onToggleBrowser?: (browser: string, enabled: boolean) => void;
  onOpenPreferences?: () => void;
}

export function BrowserStatusList({
  integrations,
  disabled = false,
  onToggleBrowser,
  onOpenPreferences,
}: BrowserStatusListProps) {
  const { t } = useLanguage();

  return (
    <Card
      className="my-5 border-border/70 bg-card/50 backdrop-blur-xs shadow-xs"
      aria-label={t("browser.label")}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold tracking-wider text-muted-foreground uppercase">
            <Globe className="size-3.5 text-primary/90" aria-hidden="true" />
            <span>{t("browser.eyebrow")}</span>
          </div>

          {onOpenPreferences && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenPreferences}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-md border border-border/60 hover:bg-muted/40 transition-colors"
            >
              <Settings2 className="size-3.5" aria-hidden="true" />
              <span>{t("browser.configure")}</span>
            </Button>
          )}
        </div>

        <CardTitle className="sr-only">{t("browser.label")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground/90 leading-relaxed max-w-xl">
          {t("browser.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map((browser) => (
            <BrowserItem
              key={browser.name}
              browser={browser}
              disabled={disabled}
              onToggle={onToggleBrowser}
            />
          ))}
          {integrations.length === 0 && (
            <div className="col-span-full py-5 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl bg-card/20">
              {t("browser.empty")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

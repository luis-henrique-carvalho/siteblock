import type { BrowserIntegration } from "../../types/siteblock";
import { BrowserItem } from "./BrowserItem";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { useLanguage } from "../../i18n";

interface BrowserStatusListProps {
  integrations: BrowserIntegration[];
}

export function BrowserStatusList({ integrations }: BrowserStatusListProps) {
  const { t } = useLanguage();
  return (
    <Card
      className="my-5 border-border/70 bg-card/60 shadow-xs"
      aria-label={t("browser.label")}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-primary uppercase">
          <Globe className="size-3.5" aria-hidden="true" />
          <span>{t("browser.eyebrow")}</span>
        </div>
        <CardTitle className="sr-only">{t("browser.label")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
          {t("browser.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {integrations.map((browser) => (
            <BrowserItem key={browser.name} browser={browser} />
          ))}
          {integrations.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg">
              {t("browser.empty")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

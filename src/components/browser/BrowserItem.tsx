import type { BrowserIntegration } from "../../types/siteblock";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n";

interface BrowserItemProps {
  browser: BrowserIntegration;
}

export function BrowserItem({ browser }: BrowserItemProps) {
  const { t } = useLanguage();
  const getStatusText = () => {
    if (!browser.detected) return t("browser.notInstalled");
    if (browser.policyReady) return t("browser.active");
    return t("browser.waiting");
  };

  const isReady = browser.detected && browser.policyReady;
  const isDetected = browser.detected;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card/60 transition-colors hover:border-border">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "browser-dot flex size-2.5 rounded-full transition-colors",
            isReady
              ? "ready bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
              : isDetected
                ? "bg-amber-500"
                : "bg-muted-foreground/40",
          )}
          aria-hidden="true"
        />
        <div className="flex flex-col">
          <strong className="text-sm font-semibold text-foreground tracking-tight">
            {browser.name}
          </strong>
          <small className="text-xs text-muted-foreground">{getStatusText()}</small>
        </div>
      </div>

      <Badge
        variant={isReady ? "default" : isDetected ? "secondary" : "outline"}
        className={cn(
          "text-[11px] font-medium gap-1 px-2 py-0.5",
          isReady
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            : isDetected
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "text-muted-foreground border-border/60",
        )}
      >
        {isReady ? (
          <CheckCircle2 className="size-3" />
        ) : isDetected ? (
          <CircleDashed className="size-3 animate-spin" />
        ) : (
          <AlertCircle className="size-3" />
        )}
        {browser.mode || getStatusText()}
      </Badge>
    </div>
  );
}

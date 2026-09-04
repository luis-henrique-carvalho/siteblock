import type { BrowserIntegration } from "@/types/siteblock";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n";
import { BrowserIcon } from "./BrowserIcon";

interface BrowserItemProps {
  browser: BrowserIntegration;
  disabled?: boolean;
  onToggle?: (name: string, enabled: boolean) => void;
}

export function BrowserItem({ browser, disabled = false, onToggle }: BrowserItemProps) {
  const { t } = useLanguage();

  const isInstalled = browser.detected;
  const isEnabled = browser.enabled;
  const isReady = isInstalled && isEnabled && browser.policyReady;
  const isSyncing = isInstalled && isEnabled && !browser.policyReady;

  const getStatusLabel = () => {
    if (!isInstalled) return t("browser.notInstalled");
    if (!isEnabled) return t("browser.disabled");
    if (isReady) return t("browser.active");
    return t("browser.waiting");
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 p-2.5 rounded-lg border transition-colors",
        isInstalled
          ? "border-border bg-card shadow-2xs"
          : "border-border/50 border-dashed bg-muted/20 opacity-70",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground transition-colors",
            isReady && "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
            isSyncing && "text-amber-500 border-amber-500/30 bg-amber-500/10",
            !isInstalled && "opacity-40 text-muted-foreground/60",
          )}
        >
          <BrowserIcon name={browser.name} className="size-4" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <strong className="text-xs font-semibold tracking-tight text-foreground truncate">
              {browser.name}
            </strong>
            {browser.requiresRestart && isEnabled && (
              <Badge
                variant="outline"
                className="text-[9px] font-normal border-amber-500/40 bg-amber-500/10 text-amber-500 px-1 py-0 shrink-0 leading-tight"
                title={t("browser.restartRequiredHint", { browser: browser.name })}
              >
                {t("browser.restartRequiredBadge")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0 transition-colors",
                isReady
                  ? "bg-emerald-500"
                  : isSyncing
                    ? "bg-amber-500 animate-pulse"
                    : isInstalled
                      ? "bg-muted-foreground/50"
                      : "bg-muted-foreground/20",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-[11px] truncate font-medium flex items-center gap-1",
                isReady
                  ? "text-emerald-500"
                  : isSyncing
                    ? "text-amber-500"
                    : "text-muted-foreground",
              )}
            >
              {isSyncing && <CircleDashed className="size-3 animate-spin" aria-hidden="true" />}
              {getStatusLabel()}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center pl-1">
        {isInstalled ? (
          <Switch
            size="sm"
            checked={isEnabled}
            disabled={disabled}
            onCheckedChange={(checked) => onToggle?.(browser.name, checked)}
            aria-label={t("browser.toggleHint", { browser: browser.name })}
          />
        ) : (
          <Badge
            variant="outline"
            className="text-[10px] font-normal text-muted-foreground/70 border-border/70 border-dashed px-1.5 py-0.5"
          >
            {t("browser.notInstalled")}
          </Badge>
        )}
      </div>
    </div>
  );
}

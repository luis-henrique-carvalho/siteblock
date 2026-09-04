import type { BrowserIntegration } from "../../types/siteblock";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n";
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
        "group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200",
        isReady
          ? "border-border/80 bg-card/75 hover:border-emerald-500/30 hover:bg-card/90 shadow-xs"
          : isEnabled
            ? "border-border/80 bg-card/70 hover:border-amber-500/30 hover:bg-card/90 shadow-xs"
            : isInstalled
              ? "border-border/60 bg-card/45 hover:border-border hover:bg-card/65 shadow-2xs opacity-90 hover:opacity-100"
              : "border-dashed border-border/50 bg-card/25 opacity-65",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 shadow-2xs transition-transform group-hover:scale-105",
            !isInstalled && "grayscale opacity-60",
          )}
        >
          <BrowserIcon name={browser.name} className="size-5" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <strong className="text-sm font-semibold tracking-tight text-foreground truncate">
              {browser.name}
            </strong>
            {browser.requiresRestart && isEnabled && (
              <Badge
                variant="outline"
                className="text-[10px] font-normal border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0 shrink-0 leading-tight"
                title={t("browser.restartRequiredHint", { browser: browser.name })}
              >
                {t("browser.restartRequiredBadge")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                "size-2 rounded-full shrink-0 transition-colors",
                isReady
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : isSyncing
                    ? "bg-amber-500 animate-pulse"
                    : isInstalled
                      ? "bg-muted-foreground/40"
                      : "bg-muted-foreground/20",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-xs truncate font-medium flex items-center gap-1",
                isReady
                  ? "text-emerald-500 dark:text-emerald-400"
                  : isSyncing
                    ? "text-amber-500 dark:text-amber-400"
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

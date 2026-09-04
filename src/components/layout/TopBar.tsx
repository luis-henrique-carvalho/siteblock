import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignalDot } from "../common/SignalDot";
import { ShieldCheck, ShieldAlert, Settings2 } from "lucide-react";
import { useLanguage } from "../../i18n";
import { useSiteBlockStore, useUIStore } from "../../stores";

interface TopBarProps {
  active?: boolean;
  onOpenPreferences?: () => void;
}

export function TopBar({
  active: propActive,
  onOpenPreferences: propOnOpenPreferences,
}: TopBarProps = {}) {
  const { t } = useLanguage();
  const storeActive = useSiteBlockStore((s) => s.state?.active ?? false);
  const setPreferencesOpen = useUIStore((s) => s.setPreferencesOpen);

  const active = propActive ?? storeActive;
  const onOpenPreferences =
    propOnOpenPreferences ?? (() => setPreferencesOpen(true));

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border pb-4 mb-5">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-foreground font-semibold text-xs">
          S/
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-foreground">SiteBlock</span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground border-border"
          >
            v0.1.0
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="flex items-center gap-2 py-1 px-2.5 rounded-md border-border bg-muted/50 text-foreground text-xs font-normal"
          role="status"
          aria-live="polite"
        >
          <SignalDot active={active} />
          <span className="flex items-center gap-1.5 font-medium">
            {active ? (
              <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
            ) : (
              <ShieldAlert className="size-3.5 text-muted-foreground" aria-hidden="true" />
            )}
            {active ? t("status.protected") : t("status.paused")}
          </span>
        </Badge>

        {onOpenPreferences && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenPreferences}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("topbar.settingsAria")}
            title={t("topbar.settings")}
          >
            <Settings2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </header>
  );
}

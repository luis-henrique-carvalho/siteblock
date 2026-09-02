import { Card } from "@/components/ui/card";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n";

interface ShieldBadgeProps {
  active: boolean;
  enabled: boolean;
  scheduleSummary: string;
  activeProfilesNames?: string[];
}

export function ShieldBadge({
  active,
  enabled,
  scheduleSummary,
  activeProfilesNames = [],
}: ShieldBadgeProps) {
  const { t } = useLanguage();
  const stateLabel = active ? t("shield.blocking") : t("shield.allowed");

  const subtitle = !enabled
    ? t("shield.enableHint")
    : activeProfilesNames.length > 0
      ? `Perfis: ${activeProfilesNames.join(", ")}`
      : scheduleSummary;

  return (
    <Card
      className={cn(
        "shield flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 shadow-sm",
        active
          ? "shield-active border-primary/50 bg-primary/10 text-primary"
          : "border-border/70 bg-card/60 text-muted-foreground",
      )}
      role="status"
      aria-label={t("shield.status", { status: stateLabel })}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-lg transition-transform",
          active
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-muted-foreground",
        )}
      >
        {active ? (
          <ShieldCheck className="size-6" aria-hidden="true" />
        ) : (
          <ShieldOff className="size-6" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-col">
        <strong
          className={cn(
            "text-base font-bold tracking-tight",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {stateLabel}
        </strong>
        <small className="text-xs text-muted-foreground leading-snug">
          {subtitle}
        </small>
      </div>
    </Card>
  );
}

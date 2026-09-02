import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Power, ShieldCheck, ShieldBan } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n";

interface MasterSwitchProps {
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function MasterSwitch({ enabled, disabled, onToggle }: MasterSwitchProps) {
  const { t } = useLanguage();
  return (
    <Card
      className={cn(
        "status-card my-6 border transition-all duration-300 shadow-md",
        enabled
          ? "border-primary/40 bg-gradient-to-r from-card via-card to-primary/5"
          : "border-border/80 bg-card/60",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-primary uppercase">
            <Power className="size-3.5" aria-hidden="true" />
            <span>{t("master.eyebrow")}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {enabled ? t("master.enabled") : t("master.disabled")}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {enabled
              ? t("master.enabledHint")
              : t("master.disabledHint")}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <Switch
              id="master-protection-switch"
              checked={enabled}
              disabled={disabled}
              onCheckedChange={onToggle}
              aria-label={t("master.switchLabel")}
            />
          </div>

          <Button
            type="button"
            size="lg"
            variant={enabled ? "default" : "outline"}
            className={cn(
              "power-button font-semibold tracking-wide gap-2 px-5 transition-all shadow-sm",
              enabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                : "border-border hover:bg-muted text-muted-foreground",
            )}
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={enabled}
          >
            {enabled ? (
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldBan className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span
              className={cn(
                "power-dot inline-block size-2 rounded-full",
                enabled ? "bg-primary-foreground" : "bg-muted-foreground",
              )}
              aria-hidden="true"
            />
            {enabled ? t("master.disable") : t("master.enable")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

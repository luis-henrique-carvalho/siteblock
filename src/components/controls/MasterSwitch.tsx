import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Power, ShieldCheck, ShieldBan } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n";
import { useSiteBlockStore, useUIStore } from "../../stores";

interface MasterSwitchProps {
  enabled?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}

export function MasterSwitch({
  enabled: propEnabled,
  disabled: propDisabled,
  onToggle: propOnToggle,
}: MasterSwitchProps = {}) {
  const { t } = useLanguage();
  const storeEnabled = useSiteBlockStore((s) => s.state?.enabled ?? false);
  const toggleEnabled = useSiteBlockStore((s) => s.toggleEnabled);
  const busy = useUIStore((s) => s.busy);
  const helperInstalled = useSiteBlockStore((s) => s.state?.helperInstalled ?? true);

  const enabled = propEnabled ?? storeEnabled;
  const disabled = propDisabled ?? (busy || !helperInstalled);
  const onToggle = propOnToggle ?? (() => void toggleEnabled());

  return (
    <Card className="border border-border bg-card shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border",
              enabled
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-muted/60 text-muted-foreground",
            )}
          >
            {enabled ? (
              <ShieldCheck className="size-5" aria-hidden="true" />
            ) : (
              <ShieldBan className="size-5" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {enabled ? t("master.enabled") : t("master.disabled")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {enabled ? t("master.enabledHint") : t("master.disabledHint")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <Switch
            id="master-protection-switch"
            checked={enabled}
            disabled={disabled}
            onCheckedChange={onToggle}
            aria-label={t("master.switchLabel")}
          />

          <Button
            type="button"
            size="sm"
            variant={enabled ? "destructive" : "default"}
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={enabled}
            className="h-8 gap-1.5 px-3 text-xs font-medium"
          >
            {enabled ? (
              <Power className="size-3.5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-3.5" aria-hidden="true" />
            )}
            {enabled ? t("master.disable") : t("master.enable")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n";
import { useSiteBlockStore, useUIStore } from "../../stores";

interface MasterSwitchProps {
  enabled?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  className?: string;
  showStatusDot?: boolean;
}

export function MasterSwitch({
  enabled: propEnabled,
  disabled: propDisabled,
  onToggle: propOnToggle,
  className,
  showStatusDot = true,
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
    <div
      className={cn(
        "flex items-center justify-between sm:justify-start gap-2.5 h-9 px-3 rounded-lg border border-border bg-card/60 text-xs select-none shadow-2xs transition-colors",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <label
        htmlFor="master-protection-switch"
        className={cn(
          "flex items-center gap-2 font-medium cursor-pointer transition-colors",
          enabled ? "text-foreground" : "text-muted-foreground",
          disabled && "cursor-not-allowed",
        )}
      >
        {showStatusDot && (
          <span
            className={cn(
              "size-2 rounded-full transition-colors",
              enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
            aria-hidden="true"
          />
        )}
        <span>{enabled ? t("master.enabled") : t("master.disabled")}</span>
      </label>

      <Switch
        id="master-protection-switch"
        checked={enabled}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-label={t("master.switchLabel")}
      />
    </div>
  );
}

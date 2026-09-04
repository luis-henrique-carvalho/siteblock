import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Clock } from "lucide-react";
import { useLanguage } from "@/i18n";

interface TimeRangePickerProps {
  start: string;
  end: string;
  disabled?: boolean;
  onChangeStart: (time: string) => void;
  onChangeEnd: (time: string) => void;
}

export function TimeRangePicker({
  start,
  end,
  disabled = false,
  onChangeStart,
  onChangeEnd,
}: TimeRangePickerProps) {
  const { t } = useLanguage();
  return (
    <div className="times flex items-center gap-3 pt-1">
      <Label className="flex-1 flex flex-col gap-1.5 text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1">
          <Clock className="size-3 text-muted-foreground" aria-hidden="true" />
          {t("schedule.start")}
        </span>
        <Input
          type="time"
          value={start}
          onChange={(e) => onChangeStart(e.target.value)}
          disabled={disabled}
          aria-label={t("schedule.startLabel")}
          className="h-8 font-mono text-xs"
        />
      </Label>

      <span className="text-muted-foreground/60 pt-4" aria-hidden="true">
        <ArrowRight className="size-3.5" />
        <span className="sr-only">→</span>
      </span>

      <Label className="flex-1 flex flex-col gap-1.5 text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1">
          <Clock className="size-3 text-muted-foreground" aria-hidden="true" />
          {t("schedule.end")}
        </span>
        <Input
          type="time"
          value={end}
          onChange={(e) => onChangeEnd(e.target.value)}
          disabled={disabled}
          aria-label={t("schedule.endLabel")}
          className="h-8 font-mono text-xs"
        />
      </Label>
    </div>
  );
}

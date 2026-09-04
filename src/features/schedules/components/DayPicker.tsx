import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage, type TranslationKey } from "@/i18n";

const weekdayKeys: TranslationKey[] = [
  "weekday.mon", "weekday.tue", "weekday.wed", "weekday.thu", "weekday.fri", "weekday.sat", "weekday.sun",
];

interface DayPickerProps {
  selectedDays: number[];
  disabled?: boolean;
  onToggleDay: (dayIndex: number) => void;
}

export function DayPicker({ selectedDays, disabled = false, onToggleDay }: DayPickerProps) {
  const { t } = useLanguage();
  return (
    <div className="days flex flex-wrap gap-1.5" role="group" aria-label={t("schedule.weekdays")}>
      {weekdayKeys.map((dayKey, index) => {
        const dayName = t(dayKey);
        const isSelected = selectedDays.includes(index);
        return (
          <Button
            key={dayName}
            type="button"
            size="xs"
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "text-xs font-mono font-medium px-2 py-1 transition-all",
              isSelected
                ? "selected bg-primary text-primary-foreground font-semibold shadow-xs"
                : "border-border/70 text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onToggleDay(index)}
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={dayName}
          >
            {dayName}
          </Button>
        );
      })}
    </div>
  );
}

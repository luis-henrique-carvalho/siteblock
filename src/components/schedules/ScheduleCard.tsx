import type { Schedule, SchedulePatch } from "../../types/schedule";
import { DayPicker } from "./DayPicker";
import { TimeRangePicker } from "./TimeRangePicker";
import { toggleScheduleDay } from "../../utils/scheduleHelpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

interface ScheduleCardProps {
  schedule: Schedule;
  index: number;
  disabled: boolean;
  onUpdate: (id: string, patch: SchedulePatch) => void;
  onRemove: (id: string) => void;
}

export function ScheduleCard({ schedule, index, disabled, onUpdate, onRemove }: ScheduleCardProps) {
  const handleToggleDay = (dayIndex: number) => {
    const updatedDays = toggleScheduleDay(schedule.days, dayIndex);
    onUpdate(schedule.id, { days: updatedDays });
  };

  return (
    <Card
      className="schedule-rule p-4 border-border/70 bg-card/50 shadow-2xs flex flex-col gap-3.5"
      aria-label={`Período ${index + 1}`}
    >
      <div className="rule-top flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="font-mono text-[11px] font-bold tracking-wider text-foreground border-border/80 px-2 py-0.5"
        >
          <span>PERÍODO {String(index + 1).padStart(2, "0")}</span>
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs gap-1 font-medium"
          onClick={() => onRemove(schedule.id)}
          disabled={disabled}
          aria-label={`Remover período ${index + 1}`}
        >
          <Trash2 className="size-3" aria-hidden="true" />
          Remover
        </Button>
      </div>

      <DayPicker selectedDays={schedule.days} disabled={disabled} onToggleDay={handleToggleDay} />

      <TimeRangePicker
        start={schedule.start}
        end={schedule.end}
        disabled={disabled}
        onChangeStart={(start) => onUpdate(schedule.id, { start })}
        onChangeEnd={(end) => onUpdate(schedule.id, { end })}
      />
    </Card>
  );
}

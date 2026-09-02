import type { Schedule, SchedulePatch } from "../../types/schedule";
import { DayPicker } from "./DayPicker";
import { TimeRangePicker } from "./TimeRangePicker";
import { toggleScheduleDay } from "../../utils/scheduleHelpers";

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
    <article className="schedule-rule" aria-label={`Período ${index + 1}`}>
      <div className="rule-top">
        <span>PERÍODO {String(index + 1).padStart(2, "0")}</span>
        <button
          type="button"
          onClick={() => onRemove(schedule.id)}
          disabled={disabled}
          aria-label={`Remover período ${index + 1}`}
        >
          Remover
        </button>
      </div>

      <DayPicker selectedDays={schedule.days} disabled={disabled} onToggleDay={handleToggleDay} />

      <TimeRangePicker
        start={schedule.start}
        end={schedule.end}
        disabled={disabled}
        onChangeStart={(start) => onUpdate(schedule.id, { start })}
        onChangeEnd={(end) => onUpdate(schedule.id, { end })}
      />
    </article>
  );
}

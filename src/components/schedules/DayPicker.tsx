import { WEEKDAYS } from "../../constants/weekdays";

interface DayPickerProps {
  selectedDays: number[];
  disabled?: boolean;
  onToggleDay: (dayIndex: number) => void;
}

export function DayPicker({ selectedDays, disabled = false, onToggleDay }: DayPickerProps) {
  return (
    <div className="days" role="group" aria-label="Dias da semana">
      {WEEKDAYS.map((dayName, index) => {
        const isSelected = selectedDays.includes(index);
        return (
          <button
            key={dayName}
            type="button"
            className={isSelected ? "selected" : ""}
            onClick={() => onToggleDay(index)}
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={dayName}
          >
            {dayName}
          </button>
        );
      })}
    </div>
  );
}

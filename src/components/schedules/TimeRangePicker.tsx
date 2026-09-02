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
  return (
    <div className="times">
      <label>
        Início
        <input
          type="time"
          value={start}
          onChange={(e) => onChangeStart(e.target.value)}
          disabled={disabled}
          aria-label="Horário de início"
        />
      </label>
      <span aria-hidden="true">→</span>
      <label>
        Fim
        <input
          type="time"
          value={end}
          onChange={(e) => onChangeEnd(e.target.value)}
          disabled={disabled}
          aria-label="Horário de fim"
        />
      </label>
    </div>
  );
}

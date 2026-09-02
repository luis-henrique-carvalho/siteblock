import type { Schedule, SchedulePatch } from "../../types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { createEmptySchedule } from "../../utils/scheduleHelpers";

interface ScheduleManagerProps {
  schedules: Schedule[];
  disabled: boolean;
  onUpdateSchedules: (updater: (prev: Schedule[]) => Schedule[]) => void;
  onSaveSchedules: () => void;
}

export function ScheduleManager({
  schedules,
  disabled,
  onUpdateSchedules,
  onSaveSchedules,
}: ScheduleManagerProps) {
  const handleAddSchedule = () => {
    onUpdateSchedules((prev) => [...prev, createEmptySchedule()]);
  };

  const handleUpdateSchedule = (id: string, patch: SchedulePatch) => {
    onUpdateSchedules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    );
  };

  const handleRemoveSchedule = (id: string) => {
    onUpdateSchedules((prev) => prev.filter((rule) => rule.id !== id));
  };

  return (
    <section className="panel schedule-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">JANELAS DE FOCO</p>
          <h2>Agenda semanal</h2>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={handleAddSchedule}
          disabled={disabled}
        >
          + Novo período
        </button>
      </div>

      <div className="schedule-list">
        {schedules.length === 0 && (
          <p className="empty-state">Sem períodos automáticos. A chave mestra controla tudo.</p>
        )}
        {schedules.map((schedule, index) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            index={index}
            disabled={disabled}
            onUpdate={handleUpdateSchedule}
            onRemove={handleRemoveSchedule}
          />
        ))}
      </div>

      <button type="button" className="save-button" onClick={onSaveSchedules} disabled={disabled}>
        Salvar agenda
      </button>
    </section>
  );
}

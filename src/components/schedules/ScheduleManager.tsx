import type { Schedule, SchedulePatch } from "../../types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { createEmptySchedule } from "../../utils/scheduleHelpers";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Save } from "lucide-react";
import { useLanguage } from "../../i18n";

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
  const { t } = useLanguage();
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
    <Card className="panel schedule-panel border-border/70 bg-card/60 shadow-xs flex flex-col">
      <CardHeader className="pb-4">
        <div className="panel-heading flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-primary uppercase">
              <Calendar className="size-3.5" aria-hidden="true" />
              <p className="eyebrow">{t("schedule.eyebrow")}</p>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t("schedule.title")}</h2>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-button gap-1.5 font-semibold text-xs border-border/80 hover:bg-muted"
            onClick={handleAddSchedule}
            disabled={disabled}
          >
            <Plus className="size-3.5" aria-hidden="true" />{t("schedule.add")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-0">
        <div className="schedule-list space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {schedules.length === 0 && (
            <div className="empty-state flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg">
              <Calendar className="size-6 text-muted-foreground/60" aria-hidden="true" />
              <p>{t("schedule.empty")}</p>
            </div>
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
      </CardContent>

      <CardFooter className="pt-2 border-t border-border/40">
        <Button
          type="button"
          className="save-button w-full gap-2 font-semibold tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          onClick={onSaveSchedules}
          disabled={disabled}
        >
          <Save className="size-4" aria-hidden="true" />
          {t("schedule.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}

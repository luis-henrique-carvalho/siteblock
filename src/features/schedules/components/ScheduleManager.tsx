import { useState, useRef, useEffect } from "react";
import type { Schedule, SchedulePatch } from "@/types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { createEmptySchedule } from "../utils/scheduleHelpers";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Save, RotateCcw } from "lucide-react";
import { useLanguage } from "@/i18n";
import { useSiteBlockStore, useUIStore } from "@/stores";

interface ScheduleManagerProps {
  schedules?: Schedule[];
  disabled?: boolean;
  onUpdateSchedules?: (updater: (prev: Schedule[]) => Schedule[]) => void;
  onSaveSchedules?: (schedules?: Schedule[]) => void;
}

const EMPTY_SCHEDULES: Schedule[] = [];

export function ScheduleManager({
  schedules: propSchedules,
  disabled: propDisabled,
  onUpdateSchedules: propOnUpdateSchedules,
  onSaveSchedules: propOnSaveSchedules,
}: ScheduleManagerProps = {}) {
  const { t } = useLanguage();
  const storeSchedules = useSiteBlockStore(
    (s) => s.getSelectedProfile()?.schedules ?? s.state?.schedules ?? EMPTY_SCHEDULES,
  );
  const storeUpdateSchedules = useSiteBlockStore((s) => s.updateLocalSchedules);
  const storeSaveSchedules = useSiteBlockStore((s) => s.saveSchedules);
  const busy = useUIStore((s) => s.busy);
  const helperInstalled = useSiteBlockStore((s) => s.state?.helperInstalled ?? true);

  const schedules = propSchedules ?? storeSchedules;
  const disabled = propDisabled ?? (busy || !helperInstalled);
  const onUpdateSchedules = propOnUpdateSchedules ?? storeUpdateSchedules;
  const onSaveSchedules = propOnSaveSchedules ?? ((s) => void storeSaveSchedules(s));

  const [isDirty, setIsDirty] = useState(false);
  const originalSchedulesRef = useRef<Schedule[]>(schedules);

  useEffect(() => {
    if (!isDirty) {
      originalSchedulesRef.current = schedules;
    }
  }, [schedules, isDirty]);

  const handleAddSchedule = () => {
    setIsDirty(true);
    onUpdateSchedules((prev) => [...prev, createEmptySchedule()]);
  };

  const handleUpdateSchedule = (id: string, patch: SchedulePatch) => {
    setIsDirty(true);
    onUpdateSchedules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    );
  };

  const handleRemoveSchedule = (targetIndex: number) => {
    setIsDirty(true);
    onUpdateSchedules((prev) => prev.filter((_, i) => i !== targetIndex));
  };

  const handleSave = () => {
    setIsDirty(false);
    onSaveSchedules(schedules);
  };

  const handleDiscard = () => {
    const saved = originalSchedulesRef.current;
    onUpdateSchedules(() => saved);
    setIsDirty(false);
  };

  return (
    <Card className="border border-border bg-card shadow-xs flex flex-col">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{t("schedule.title")}</h2>
          {isDirty && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono px-1.5 py-0 border-amber-500/40 bg-amber-500/10 text-amber-500"
            >
              {t("schedule.unsaved")}
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs font-medium"
          onClick={handleAddSchedule}
          disabled={disabled}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("schedule.add")}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {schedules.length === 0 && (
            <div className="empty-state flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg">
              <Calendar className="size-6 text-muted-foreground/60" aria-hidden="true" />
              <p>{t("schedule.empty")}</p>
            </div>
          )}
          {schedules.map((schedule, index) => (
            <ScheduleCard
              key={`${schedule.id}-${index}`}
              schedule={schedule}
              index={index}
              disabled={disabled}
              onUpdate={handleUpdateSchedule}
              onRemove={() => handleRemoveSchedule(index)}
            />
          ))}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t border-border/40 flex items-center justify-end gap-2">
        {isDirty && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={handleDiscard}
            disabled={disabled}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t("schedule.discard")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="gap-2 text-xs font-medium"
          onClick={handleSave}
          disabled={disabled}
        >
          <Save className="size-3.5" aria-hidden="true" />
          {t("schedule.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}

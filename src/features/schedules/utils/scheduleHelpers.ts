import { DEFAULT_END_TIME, DEFAULT_SCHEDULE_DAYS, DEFAULT_START_TIME } from "@/constants/weekdays";
import type { Schedule } from "@/types/schedule";
import { translate, type Translate } from "@/i18n";

/**
 * Creates a default new schedule rule.
 */
export function createEmptySchedule(): Schedule {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sched-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    days: [...DEFAULT_SCHEDULE_DAYS],
    start: DEFAULT_START_TIME,
    end: DEFAULT_END_TIME,
  };
}

/**
 * Toggles a day index in the days array, keeping the result sorted.
 */
export function toggleScheduleDay(days: number[], day: number): number[] {
  if (days.includes(day)) {
    return days.filter((item) => item !== day);
  }
  return [...days, day].sort((a, b) => a - b);
}

/**
 * Formats a human-readable summary of configured schedule rules.
 */
export function getScheduleSummary(
  schedulesCount: number,
  t: Translate = (key, values) => translate("pt-BR", key, values),
): string {
  if (schedulesCount === 0) {
    return t("schedule.summaryNone");
  }
  return schedulesCount === 1
    ? t("schedule.summaryOne")
    : t("schedule.summaryMany", { count: schedulesCount });
}

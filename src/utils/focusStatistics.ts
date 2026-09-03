import type { FocusStatistics, FocusStatisticsQuery } from "../types/focusStatistics";

export const FOCUS_STATISTICS_PERIODS = [7, 30, 90] as const;

export type FocusStatisticsPeriod = (typeof FOCUS_STATISTICS_PERIODS)[number];

export type FocusDurationLabels = {
  hour: string;
  minute: string;
};

export const EMPTY_FOCUS_STATISTICS: FocusStatistics = {
  protectedSeconds: 0,
  completedSessions: 0,
  daily: [],
  domains: [],
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createFocusStatisticsQuery(
  period: FocusStatisticsPeriod,
  profileId: string,
  referenceDate = new Date(),
): FocusStatisticsQuery {
  const from = new Date(referenceDate);
  from.setDate(from.getDate() - (period - 1));

  return {
    from: formatDateKey(from),
    to: formatDateKey(referenceDate),
    ...(profileId ? { profileId } : {}),
  };
}

export function formatFocusDuration(seconds: number, labels: FocusDurationLabels) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0) return `${minutes} ${labels.minute}`;
  if (minutes === 0) return `${hours} ${labels.hour}`;
  return `${hours} ${labels.hour} ${minutes} ${labels.minute}`;
}

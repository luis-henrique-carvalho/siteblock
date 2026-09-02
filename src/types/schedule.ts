export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Schedule {
  id: string;
  days: number[];
  start: string;
  end: string;
}

export type SchedulePatch = Partial<Omit<Schedule, "id">>;

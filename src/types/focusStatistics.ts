export interface FocusStatisticsQuery {
  from: string;
  to: string;
  profileId?: string;
}

export interface FocusDaily {
  date: string;
  protectedSeconds: number;
}

export interface FocusDomainStatistic {
  domain: string;
  protectedSeconds: number;
  completedSessions: number;
}

export interface FocusStatistics {
  protectedSeconds: number;
  completedSessions: number;
  daily: FocusDaily[];
  domains: FocusDomainStatistic[];
}

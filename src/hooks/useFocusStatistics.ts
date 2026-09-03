import { useCallback, useEffect, useMemo, useState } from "react";
import type { ISiteBlockApi } from "../services/siteblockApi";
import type { FocusStatistics } from "../types/focusStatistics";
import {
  createFocusStatisticsQuery,
  EMPTY_FOCUS_STATISTICS,
  type FocusStatisticsPeriod,
} from "../utils/focusStatistics";

export function useFocusStatistics({
  api,
  available,
}: {
  api: Pick<ISiteBlockApi, "getFocusStatistics">;
  available: boolean;
}) {
  const [period, setPeriod] = useState<FocusStatisticsPeriod>(7);
  const [profileId, setProfileId] = useState("");
  const [statistics, setStatistics] = useState<FocusStatistics>(EMPTY_FOCUS_STATISTICS);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [settledRequest, setSettledRequest] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);

  const query = useMemo(() => createFocusStatisticsQuery(period, profileId), [period, profileId]);
  const getFocusStatistics = api.getFocusStatistics;
  const requestKey = `${query.from}:${query.to}:${query.profileId ?? ""}:${refreshVersion}`;
  const loading = available && Boolean(getFocusStatistics) && settledRequest !== requestKey;
  const error = available && (!getFocusStatistics || failedRequest === requestKey);

  const reload = useCallback(() => setRefreshVersion((version) => version + 1), []);

  useEffect(() => {
    if (!available || !getFocusStatistics) return;

    let cancelled = false;

    async function loadStatistics() {
      try {
        const nextStatistics = await getFocusStatistics(query);
        if (cancelled) return;
        setStatistics(nextStatistics);
        setSettledRequest(requestKey);
      } catch {
        if (cancelled) return;
        setFailedRequest(requestKey);
        setSettledRequest(requestKey);
      }
    }

    void loadStatistics();

    return () => {
      cancelled = true;
    };
  }, [available, getFocusStatistics, query, requestKey]);

  return {
    error,
    loading,
    period,
    profileId,
    reload,
    setPeriod,
    setProfileId,
    statistics,
  };
}

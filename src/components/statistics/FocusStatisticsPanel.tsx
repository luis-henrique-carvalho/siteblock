import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3Icon, ShieldAlertIcon } from "lucide-react";
import { useFocusStatistics } from "../../hooks/useFocusStatistics";
import { useLanguage } from "../../i18n";
import type { ISiteBlockApi } from "../../services/siteblockApi";
import type { Profile } from "../../types/siteblock";
import {
  FOCUS_STATISTICS_PERIODS,
  formatFocusDuration,
  type FocusStatisticsPeriod,
} from "../../utils/focusStatistics";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

import { siteblockApi } from "../../services/siteblockApi";
import { useSiteBlockStore, useUIStore } from "../../stores";

export interface FocusStatisticsPanelProps {
  profiles?: Profile[];
  api?: Pick<ISiteBlockApi, "getFocusStatistics">;
  available?: boolean;
}

const EMPTY_PROFILES: Profile[] = [];

export function FocusStatisticsPanel({
  profiles: propProfiles,
  api: propApi,
  available: propAvailable,
}: FocusStatisticsPanelProps = {}) {
  const { t, language } = useLanguage();
  const storeProfiles = useSiteBlockStore((s) => s.state?.profiles ?? EMPTY_PROFILES);
  const helperInstalled = useSiteBlockStore((s) => s.state?.helperInstalled ?? false);
  const integrationRequired = useUIStore((s) => s.integrationRequired);

  const profiles = propProfiles ?? storeProfiles;
  const api = propApi ?? siteblockApi;
  const available = propAvailable ?? (helperInstalled && !integrationRequired);

  const { error, loading, period, profileId, reload, setPeriod, setProfileId, statistics } =
    useFocusStatistics({ api, available });
  const isEmpty = !loading && statistics.protectedSeconds === 0;
  const periodLabels: Record<FocusStatisticsPeriod, string> = {
    7: t("statistics.period7"),
    30: t("statistics.period30"),
    90: t("statistics.period90"),
  };
  const durationLabels = {
    hour: t("statistics.hourAbbreviation"),
    minute: t("statistics.minuteAbbreviation"),
  };
  const formatDuration = (seconds: number) => formatFocusDuration(seconds, durationLabels);

  const chartConfig = useMemo(
    () =>
      ({
        protectedSeconds: {
          label: t("statistics.protectedTime"),
          color: "var(--chart-1)",
        },
      }) satisfies ChartConfig,
    [t],
  );

  const chartData = useMemo(() => {
    if (!statistics.daily || statistics.daily.length === 0) {
      return [];
    }

    const dailyMap = new Map<string, number>();
    for (const item of statistics.daily) {
      dailyMap.set(item.date, item.protectedSeconds);
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let endDate = todayMidnight;
    if (statistics.daily.length > 0) {
      const sortedDates = statistics.daily.map((d) => d.date).sort();
      const maxDateStr = sortedDates[sortedDates.length - 1];
      if (maxDateStr) {
        const [y, m, d] = maxDateStr.split("-").map(Number);
        const maxDailyDate = new Date(y, m - 1, d);
        const diffDays = Math.round(
          (todayMidnight.getTime() - maxDailyDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays < 0 || diffDays >= period) {
          endDate = maxDailyDate;
        }
      }
    }

    const items: { date: string; protectedSeconds: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${day}`;
      items.push({
        date: dateKey,
        protectedSeconds: dailyMap.get(dateKey) ?? 0,
      });
    }

    return items;
  }, [statistics.daily, period]);

  const locale = language === "pt-BR" ? "pt-BR" : "en-US";

  const formatXAxisTick = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      if (period === 7) {
        const weekday = date
          .toLocaleDateString(locale, { weekday: "short" })
          .replace(".", "");
        return weekday.charAt(0).toUpperCase() + weekday.slice(1);
      }
      return date.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return dateStr.slice(5);
    }
  };

  const formatTooltipDate = (label: React.ReactNode) => {
    if (typeof label !== "string") return label;
    try {
      const [year, month, day] = label.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const formatted = date.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return label;
    }
  };

  return (
    <section className="mt-8 flex flex-col gap-6" aria-labelledby="focus-statistics-title">
      <div className="flex flex-col gap-4">
        <div>
          <h2 id="focus-statistics-title" className="text-xl font-semibold tracking-tight">
            {t("statistics.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("statistics.description")}</p>
        </div>

        <FieldGroup className="flex flex-row flex-wrap items-end gap-4">
          <Field className="w-full sm:w-40">
            <FieldLabel>{t("statistics.period")}</FieldLabel>
            <Select
              value={String(period)}
              onValueChange={(value) => setPeriod(Number(value) as FocusStatisticsPeriod)}
            >
              <SelectTrigger aria-label={t("statistics.periodAria")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FOCUS_STATISTICS_PERIODS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {periodLabels[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field className="w-full sm:w-40">
            <FieldLabel>{t("statistics.profile")}</FieldLabel>
            <Select
              value={profileId || "all"}
              onValueChange={(value) => setProfileId(value === "all" ? "" : value)}
            >
              <SelectTrigger aria-label={t("statistics.profileAria")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("statistics.allProfiles")}</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </div>

      {!available ? (
        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>{t("statistics.unavailableTitle")}</AlertTitle>
          <AlertDescription>{t("statistics.unavailableDescription")}</AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>{t("statistics.errorTitle")}</AlertTitle>
          <AlertDescription>{t("statistics.errorDescription")}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              {t("statistics.retry")}
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>{t("statistics.protectedTime")}</CardDescription>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <CardTitle className="text-3xl">
                    {formatDuration(statistics.protectedSeconds)}
                  </CardTitle>
                )}
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>{t("statistics.completedSessions")}</CardDescription>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <CardTitle className="text-3xl">{statistics.completedSessions}</CardTitle>
                )}
              </CardHeader>
            </Card>
          </div>

          {isEmpty ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart3Icon />
                </EmptyMedia>
                <EmptyTitle>{t("statistics.emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("statistics.emptyDescription")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t("statistics.periodRhythm")}</CardTitle>
                  <CardDescription>{t("statistics.dailyProtection")}</CardDescription>
                  <CardAction>
                    <Badge variant="outline" className="text-xs font-normal">
                      {periodLabels[period]}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="pt-2">
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[220px] w-full"
                  >
                    <BarChart
                      data={chartData}
                      accessibilityLayer
                      margin={{ left: 8, right: 8, top: 12, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="protectedSecondsBar" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="var(--color-protectedSeconds)"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-protectedSeconds)"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="stroke-border/40"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={16}
                        tickFormatter={formatXAxisTick}
                        className="text-xs text-muted-foreground"
                      />
                      <YAxis hide />
                      <ChartTooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.15, radius: 4 }}
                        content={
                          <ChartTooltipContent
                            labelFormatter={formatTooltipDate}
                            formatter={(value, name) => (
                              <div className="flex w-full items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                    style={{ backgroundColor: "var(--color-protectedSeconds)" }}
                                  />
                                  <span className="text-muted-foreground">{name}</span>
                                </div>
                                <span className="font-mono font-semibold text-foreground">
                                  {formatDuration(Number(value))}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar
                        dataKey="protectedSeconds"
                        name={t("statistics.protectedTime")}
                        fill="url(#protectedSecondsBar)"
                        radius={period === 7 ? [6, 6, 0, 0] : [3, 3, 0, 0]}
                        maxBarSize={period === 7 ? 36 : period === 30 ? 12 : 6}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("statistics.domains")}</CardTitle>
                  <CardDescription>{t("statistics.mostProtected")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("statistics.domain")}</TableHead>
                        <TableHead className="text-right">{t("statistics.time")}</TableHead>
                        <TableHead className="text-right">{t("statistics.sessions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.domains.map((domain, index) => (
                        <TableRow key={`${domain.domain}-${index}`}>
                          <TableCell className="font-medium">{domain.domain}</TableCell>
                          <TableCell className="text-right">
                            {formatDuration(domain.protectedSeconds)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{domain.completedSessions}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default FocusStatisticsPanel;

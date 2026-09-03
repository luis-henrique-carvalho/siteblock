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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
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

export function FocusStatisticsPanel({
  profiles,
  api,
  available,
}: {
  profiles: Profile[];
  api: Pick<ISiteBlockApi, "getFocusStatistics">;
  available: boolean;
}) {
  const { t } = useLanguage();
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
              <Card>
                <CardHeader>
                  <CardDescription>{t("statistics.dailyProtection")}</CardDescription>
                  <CardTitle>{t("statistics.periodRhythm")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      protectedSeconds: {
                        label: t("statistics.protectedTime"),
                        color: "var(--primary)",
                      },
                    }}
                    className="h-48 w-full"
                  >
                    <BarChart data={statistics.daily} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(date) => date.slice(5)}
                      />
                      <YAxis hide />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatDuration(Number(value))}
                          />
                        }
                      />
                      <Bar
                        dataKey="protectedSeconds"
                        fill="var(--color-protectedSeconds)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>{t("statistics.mostProtected")}</CardDescription>
                  <CardTitle>{t("statistics.domains")}</CardTitle>
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
                      {statistics.domains.map((domain) => (
                        <TableRow key={domain.domain}>
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

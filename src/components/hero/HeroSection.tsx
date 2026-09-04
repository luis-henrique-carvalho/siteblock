import { useMemo } from "react";
import { ShieldBadge } from "./ShieldBadge";
import { useLanguage } from "../../i18n";
import { useSiteBlockStore } from "../../stores";
import { getScheduleSummary } from "../../utils/scheduleHelpers";

interface HeroSectionProps {
  active?: boolean;
  enabled?: boolean;
  scheduleSummary?: string;
  activeProfilesNames?: string[];
}

export function HeroSection({
  active: propActive,
  enabled: propEnabled,
  scheduleSummary: propScheduleSummary,
  activeProfilesNames: propActiveProfilesNames,
}: HeroSectionProps = {}) {
  const { t } = useLanguage();
  const state = useSiteBlockStore((s) => s.state);
  const selectedProfile = useSiteBlockStore((s) => s.getSelectedProfile());

  const active = propActive ?? (state?.active ?? false);
  const enabled = propEnabled ?? (state?.enabled ?? false);

  const profiles = state?.profiles;
  const activeProfileIds = state?.activeProfileIds;

  const activeProfilesNames = useMemo(() => {
    if (propActiveProfilesNames) return propActiveProfilesNames;
    if (!profiles || !activeProfileIds) return [];
    return profiles.filter((p) => activeProfileIds.includes(p.id)).map((p) => p.name);
  }, [propActiveProfilesNames, profiles, activeProfileIds]);

  const scheduleSummary = useMemo(() => {
    if (propScheduleSummary !== undefined) return propScheduleSummary;
    return getScheduleSummary(
      selectedProfile?.schedules.length ?? state?.schedules.length ?? 0,
      t,
    );
  }, [propScheduleSummary, selectedProfile?.schedules.length, state?.schedules.length, t]);

  return (
    <section className="hero my-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-2 max-w-xl">
        <p className="eyebrow text-xs font-mono font-semibold tracking-wider text-primary uppercase">
          {t("hero.eyebrow")}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {t("hero.titleBefore")}{" "}
          <em className="italic font-serif text-primary underline decoration-primary/40 underline-offset-4">
            {t("hero.titleEmphasis")}
          </em>
        </h1>
        <p className="hero-copy text-sm text-muted-foreground leading-relaxed">
          {t("hero.description")}
        </p>
      </div>

      <div className="shrink-0">
        <ShieldBadge
          active={active}
          enabled={enabled}
          scheduleSummary={scheduleSummary}
          activeProfilesNames={activeProfilesNames}
        />
      </div>
    </section>
  );
}

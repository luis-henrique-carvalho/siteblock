import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Check, Languages, MonitorCog } from "lucide-react";
import { LANGUAGES, type Language, useLanguage } from "../../i18n";

const languageNames: Record<Language, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

export function PreferencesPanel() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Card className="preferences-panel mt-6 border-border/70 bg-card/60 shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-primary uppercase">
          <MonitorCog className="size-3.5" aria-hidden="true" />
          <span>{t("preferences.eyebrow")}</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t("preferences.title")}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          {t("preferences.description")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 rounded-lg border border-border/70 bg-background/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <Languages className="size-4" aria-hidden="true" />
            </div>
            <div>
              <label htmlFor="language" className="block text-sm font-semibold text-foreground">
                {t("preferences.language")}
              </label>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t("preferences.languageDescription")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="hidden items-center gap-1.5 text-[11px] font-mono text-muted-foreground sm:flex">
              <Check className="size-3 text-primary" aria-hidden="true" />
              {t("preferences.saved")}
            </span>
            <NativeSelect
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              aria-label={t("preferences.language")}
              className="min-w-44"
            >
              {LANGUAGES.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {languageNames[option]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

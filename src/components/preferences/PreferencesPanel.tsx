import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Languages, MonitorCog } from "lucide-react";
import { LANGUAGES, type Language, useLanguage } from "../../i18n";

const languageNames: Record<Language, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

interface PreferencesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreferencesPanel({ open, onOpenChange }: PreferencesPanelProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border/80 bg-popover p-0 shadow-2xl sm:max-w-xl">
        <DialogHeader className="relative gap-3 overflow-hidden border-b border-border/70 bg-gradient-to-br from-primary/[0.09] via-popover to-popover px-7 pt-7 pb-6 pr-14">
          <div
            className="absolute -top-12 -right-10 size-40 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2 text-[11px] font-mono font-bold tracking-[0.15em] text-primary uppercase">
            <MonitorCog className="size-3.5" aria-hidden="true" />
            <span>{t("preferences.eyebrow")}</span>
          </div>
          <DialogTitle className="relative text-2xl font-bold tracking-tight text-foreground">
            {t("preferences.title")}
          </DialogTitle>
          <DialogDescription className="relative max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("preferences.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 py-6">
          <section className="rounded-xl border border-border/80 bg-background/45 p-5 shadow-inner shadow-black/5">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-sm">
                <Languages className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {t("preferences.language")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("preferences.languageDescription")}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-border/70 pt-4">
              <NativeSelect
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                aria-label={t("preferences.language")}
                className="w-full"
              >
                {LANGUAGES.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {languageNames[option]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <span className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
                {t("preferences.saved")}
              </span>
            </div>
          </section>
        </div>

        <DialogFooter
          className="-mx-0 -mb-0 border-border/70 bg-muted/30 px-7 py-4"
          showCloseButton={false}
        >
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-w-24 font-semibold">
              {t("preferences.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useLanguage } from "../../i18n";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-8 border-t border-border/60 pt-5 flex flex-col gap-3">
      <p className="text-xs text-muted-foreground/80 leading-relaxed">
        {t("footer.description")}
      </p>
    </footer>
  );
}

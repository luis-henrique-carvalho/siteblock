import { DomainForm } from "./DomainForm";
import { DomainList } from "./DomainList";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListFilter, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n";
import { useSiteBlockStore, useUIStore } from "../../stores";

interface DomainManagerProps {
  domains?: string[];
  message?: string;
  disabled?: boolean;
  onAddDomain?: (domain: string) => Promise<boolean>;
  onRemoveDomain?: (domain: string) => void;
}

const EMPTY_DOMAINS: string[] = [];

export function DomainManager({
  domains: propDomains,
  message,
  disabled: propDisabled,
  onAddDomain: propOnAddDomain,
  onRemoveDomain: propOnRemoveDomain,
}: DomainManagerProps = {}) {
  const { t } = useLanguage();
  const storeDomains = useSiteBlockStore(
    (s) => s.getSelectedProfile()?.domains ?? s.state?.domains ?? EMPTY_DOMAINS,
  );
  const storeAddDomain = useSiteBlockStore((s) => s.addDomain);
  const storeRemoveDomain = useSiteBlockStore((s) => s.removeDomain);
  const busy = useUIStore((s) => s.busy);
  const helperInstalled = useSiteBlockStore((s) => s.state?.helperInstalled ?? true);

  const domains = propDomains ?? storeDomains;
  const disabled = propDisabled ?? (busy || !helperInstalled);
  const onAddDomain = propOnAddDomain ?? storeAddDomain;
  const onRemoveDomain = propOnRemoveDomain ?? ((d) => void storeRemoveDomain(d));

  const isError = message ? message.startsWith("Erro:") : false;

  return (
    <Card className="panel domains-panel border-border/70 bg-card/60 shadow-xs flex flex-col">
      <CardHeader className="pb-4">
        <div className="panel-heading flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-primary uppercase">
              <ListFilter className="size-3.5" aria-hidden="true" />
              <p className="eyebrow">{t("domains.eyebrow")}</p>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t("domains.destinations", { count: domains.length })}
            </h2>
          </div>

          <Badge
            variant="outline"
            className="counter text-xs font-mono px-2.5 py-1 border-border/80 text-foreground font-bold tracking-wider"
            aria-label={t("domains.total", { count: domains.length })}
          >
            {domains.length.toString().padStart(2, "0")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-0">
        <DomainForm disabled={disabled} onAddDomain={onAddDomain} />

        {message && (
          <div
            className={cn(
              "inline-message mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-md font-mono tracking-tight transition-colors border",
              isError
                ? "error border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/40 bg-primary/10 text-primary",
            )}
            role={isError ? "alert" : "status"}
            aria-live="polite"
          >
            {isError ? (
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{message}</span>
          </div>
        )}

        <DomainList domains={domains} disabled={disabled} onRemoveDomain={onRemoveDomain} />
      </CardContent>
    </Card>
  );
}

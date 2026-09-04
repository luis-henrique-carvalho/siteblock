import { DomainForm } from "./DomainForm";
import { DomainList } from "./DomainList";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListFilter, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n";
import { useSiteBlockStore, useUIStore } from "@/stores";

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
    <Card className="border border-border bg-card shadow-xs flex flex-col">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListFilter className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {t("domains.destinations", { count: domains.length })}
          </h2>
        </div>

        <Badge
          variant="secondary"
          className="font-mono text-xs px-2 py-0.5 font-semibold text-foreground border-border"
          aria-label={t("domains.total", { count: domains.length })}
        >
          {domains.length.toString().padStart(2, "0")}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0 space-y-3">
        <DomainForm disabled={disabled} onAddDomain={onAddDomain} />

        {message && (
          <div
            className={cn(
              "inline-message mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-md font-mono tracking-tight transition-colors border",
              isError
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
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

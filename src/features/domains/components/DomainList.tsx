import { DomainItem } from "./DomainItem";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n";

interface DomainListProps {
  domains: string[];
  disabled: boolean;
  onRemoveDomain: (domain: string) => void;
}

export function DomainList({ domains, disabled, onRemoveDomain }: DomainListProps) {
  const { t } = useLanguage();
  return (
    <ul className="domain-list space-y-2 mt-4 max-h-[360px] overflow-y-auto pr-1">
      {domains.length === 0 && (
        <li className="empty-state flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg">
          <ShieldCheck className="size-6 text-muted-foreground/60" aria-hidden="true" />
          <span>{t("domains.empty")}</span>
        </li>
      )}
      {domains.map((domain, index) => (
        <DomainItem
          key={domain}
          domain={domain}
          index={index}
          disabled={disabled}
          onRemove={onRemoveDomain}
        />
      ))}
    </ul>
  );
}

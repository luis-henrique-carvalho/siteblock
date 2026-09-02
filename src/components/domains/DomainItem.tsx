import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Globe } from "lucide-react";

interface DomainItemProps {
  domain: string;
  index: number;
  disabled: boolean;
  onRemove: (domain: string) => void;
}

export function DomainItem({ domain, index, disabled, onRemove }: DomainItemProps) {
  return (
    <li className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-border/60 bg-card/40 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Badge
          variant="outline"
          className="domain-index font-mono text-[11px] size-6 p-0 flex items-center justify-center text-muted-foreground border-border/80 shrink-0"
        >
          {String(index + 1).padStart(2, "0")}
        </Badge>
        <div className="flex items-center gap-2 truncate">
          <Globe className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground truncate">{domain}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
        aria-label={`Remover ${domain}`}
        onClick={() => onRemove(domain)}
        disabled={disabled}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        <span className="sr-only">×</span>
      </Button>
    </li>
  );
}

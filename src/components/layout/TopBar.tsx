import { Badge } from "@/components/ui/badge";
import { SignalDot } from "../common/SignalDot";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface TopBarProps {
  active: boolean;
}

export function TopBar({ active }: TopBarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-xs font-bold text-sm">
          S/
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-foreground">SiteBlock</span>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[10px] tracking-wider uppercase font-semibold text-muted-foreground border-border/80"
          >
            v0.1.0
          </Badge>
        </div>
      </div>

      <Badge
        variant="secondary"
        className="flex items-center gap-2 py-1.5 px-3 rounded-full border border-border/80 bg-secondary/60 text-secondary-foreground text-xs font-medium tracking-wide"
        role="status"
        aria-live="polite"
      >
        <SignalDot active={active} />
        <span className="flex items-center gap-1.5">
          {active ? (
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          Sistema {active ? "em proteção" : "em pausa"}
        </span>
      </Badge>
    </header>
  );
}

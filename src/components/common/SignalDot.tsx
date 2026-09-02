import { cn } from "@/lib/utils";

interface SignalDotProps {
  active: boolean;
  className?: string;
}

export function SignalDot({ active, className = "" }: SignalDotProps) {
  return (
    <span
      className={cn(
        "signal relative inline-flex h-2.5 w-2.5 rounded-full transition-colors",
        active ? "on bg-primary shadow-[0_0_8px_rgba(255,100,50,0.6)]" : "bg-muted-foreground/40",
        className,
      )}
      aria-hidden="true"
    >
      {active && (
        <span className="absolute -inset-0.5 animate-ping rounded-full bg-primary/40 opacity-75" />
      )}
    </span>
  );
}

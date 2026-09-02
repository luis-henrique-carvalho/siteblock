import { cn } from "@/lib/utils";
import { Info, AlertTriangle } from "lucide-react";

interface FooterProps {
  message?: string;
}

export function Footer({ message }: FooterProps) {
  const isError = message ? message.toLowerCase().includes("erro") : false;

  return (
    <footer className="mt-8 border-t border-border/60 pt-5 flex flex-col gap-3">
      {message && (
        <div
          className={cn(
            "flex items-center gap-2.5 text-xs px-3.5 py-2.5 rounded-lg border font-mono tracking-tight transition-colors shadow-2xs",
            isError
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-primary/40 bg-primary/10 text-primary",
          )}
          role={isError ? "alert" : "status"}
          aria-live="polite"
        >
          {isError ? (
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <Info className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{message}</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground/80 leading-relaxed">
        Autorização solicitada uma vez por abertura do app, ou ao atualizar a integração. Alterações
        da lista são aplicadas automaticamente.
      </p>
    </footer>
  );
}

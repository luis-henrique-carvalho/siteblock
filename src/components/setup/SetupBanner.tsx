import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";

interface SetupBannerProps {
  onInstall: () => void;
  busy: boolean;
}

export function SetupBanner({ onInstall, busy }: SetupBannerProps) {
  return (
    <aside role="alert" className="my-4">
      <Alert className="border-amber-500/40 bg-amber-950/20 text-amber-200 dark:border-amber-500/30 dark:bg-amber-950/30 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <AlertTitle className="text-amber-100 font-semibold text-sm">
              Configure a integração do sistema.
            </AlertTitle>
            <AlertDescription className="text-amber-200/80 text-xs mt-0.5">
              Autorize agora para preparar o bloqueio e os navegadores.
            </AlertDescription>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 shrink-0 self-end sm:self-center font-medium"
          onClick={onInstall}
          disabled={busy}
        >
          {busy && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
          {busy ? "Configurando…" : "Configurar agora"}
        </Button>
      </Alert>
    </aside>
  );
}

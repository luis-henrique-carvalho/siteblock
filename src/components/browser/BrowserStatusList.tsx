import type { BrowserIntegration } from "../../types/siteblock";
import { BrowserItem } from "./BrowserItem";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

interface BrowserStatusListProps {
  integrations: BrowserIntegration[];
}

export function BrowserStatusList({ integrations }: BrowserStatusListProps) {
  return (
    <Card
      className="my-5 border-border/70 bg-card/60 shadow-xs"
      aria-label="Integração com navegadores"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-primary uppercase">
          <Globe className="size-3.5" aria-hidden="true" />
          <span>INTEGRAÇÃO CONTÍNUA</span>
        </div>
        <CardTitle className="sr-only">Integração com navegadores</CardTitle>
        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
          A lista é aplicada automaticamente. Chrome e Brave recebem a política no momento da
          mudança; a extensão elimina também páginas que já estão abertas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {integrations.map((browser) => (
            <BrowserItem key={browser.name} browser={browser} />
          ))}
          {integrations.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg">
              Integração será verificada após a configuração.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

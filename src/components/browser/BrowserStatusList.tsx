import type { BrowserIntegration } from "../../types/siteblock";
import { BrowserItem } from "./BrowserItem";

interface BrowserStatusListProps {
  integrations: BrowserIntegration[];
}

export function BrowserStatusList({ integrations }: BrowserStatusListProps) {
  return (
    <section className="browser-status" aria-label="Integração com navegadores">
      <div>
        <p className="eyebrow">INTEGRAÇÃO CONTÍNUA</p>
        <p className="browser-copy">
          A lista é aplicada automaticamente. Chrome e Brave recebem a política no momento da
          mudança; a extensão elimina também páginas que já estão abertas.
        </p>
      </div>
      <div className="browser-list">
        {integrations.map((browser) => (
          <BrowserItem key={browser.name} browser={browser} />
        ))}
        {integrations.length === 0 && (
          <span className="browser-empty">Integração será verificada após a configuração.</span>
        )}
      </div>
    </section>
  );
}

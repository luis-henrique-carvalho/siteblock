import type { BrowserIntegration } from "../../types/siteblock";

interface BrowserItemProps {
  browser: BrowserIntegration;
}

export function BrowserItem({ browser }: BrowserItemProps) {
  const getStatusText = () => {
    if (!browser.detected) return "Não instalado";
    if (browser.policyReady) return "Política ativa";
    return "Aguardando política";
  };

  return (
    <div className="browser-item">
      <span className={`browser-dot ${browser.detected && browser.policyReady ? "ready" : ""}`} aria-hidden="true" />
      <div>
        <strong>{browser.name}</strong>
        <small>{getStatusText()}</small>
      </div>
    </div>
  );
}

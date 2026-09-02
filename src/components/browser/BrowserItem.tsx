import type { BrowserIntegration } from "../../types/siteblock";

interface BrowserItemProps {
  browser: BrowserIntegration;
}

export function BrowserItem({ browser }: BrowserItemProps) {
  const getStatusText = () => {
    if (browser.extensionConnected) return "Conectado — regras imediatas";
    if (browser.extensionRegistered) return "Extensão instalada";
    if (browser.policyReady) return browser.mode;
    return "Aguardando integração";
  };

  return (
    <div className="browser-item">
      <span className={`browser-dot ${browser.detected ? "ready" : ""}`} aria-hidden="true" />
      <div>
        <strong>{browser.name}</strong>
        <small>{getStatusText()}</small>
      </div>
    </div>
  );
}

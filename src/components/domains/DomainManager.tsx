import { DomainForm } from "./DomainForm";
import { DomainList } from "./DomainList";

interface DomainManagerProps {
  domains: string[];
  message?: string;
  disabled: boolean;
  onAddDomain: (domain: string) => Promise<boolean>;
  onRemoveDomain: (domain: string) => void;
}

export function DomainManager({
  domains,
  message,
  disabled,
  onAddDomain,
  onRemoveDomain,
}: DomainManagerProps) {
  const isError = message ? message.startsWith("Erro:") : false;

  return (
    <section className="panel domains-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LISTA DE BLOQUEIO</p>
          <h2>{domains.length} destinos</h2>
        </div>
        <span className="counter" aria-label={`Total: ${domains.length} domínios`}>
          {domains.length.toString().padStart(2, "0")}
        </span>
      </div>

      <DomainForm disabled={disabled} onAddDomain={onAddDomain} />

      {message && (
        <p
          className={isError ? "inline-message error" : "inline-message"}
          role={isError ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <DomainList domains={domains} disabled={disabled} onRemoveDomain={onRemoveDomain} />
    </section>
  );
}

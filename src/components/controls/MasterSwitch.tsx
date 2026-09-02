interface MasterSwitchProps {
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function MasterSwitch({ enabled, disabled, onToggle }: MasterSwitchProps) {
  return (
    <section className="status-card">
      <div>
        <p className="eyebrow">CHAVE MESTRA</p>
        <h2>{enabled ? "Proteção habilitada" : "Proteção em pausa"}</h2>
        <p>
          {enabled
            ? "As regras e horários abaixo estão valendo."
            : "Nenhum site será bloqueado até você reativar."}
        </p>
      </div>
      <button
        type="button"
        className={`power-button ${enabled ? "is-on" : ""}`}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={enabled}
      >
        <span className="power-dot" aria-hidden="true" />
        {enabled ? "Desativar" : "Ativar"}
      </button>
    </section>
  );
}

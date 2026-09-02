interface ShieldBadgeProps {
  active: boolean;
  enabled: boolean;
  scheduleSummary: string;
}

export function ShieldBadge({ active, enabled, scheduleSummary }: ShieldBadgeProps) {
  const stateLabel = active ? "Bloqueando agora" : "Acesso liberado";

  return (
    <div
      className={`shield ${active ? "shield-active" : ""}`}
      role="status"
      aria-label={`Status do escudo: ${stateLabel}`}
    >
      <span className="shield-icon" aria-hidden="true">
        ⌁
      </span>
      <strong>{stateLabel}</strong>
      <small>{enabled ? scheduleSummary : "Ative o bloqueio para aplicar as regras."}</small>
    </div>
  );
}

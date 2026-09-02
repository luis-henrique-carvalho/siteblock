interface DomainItemProps {
  domain: string;
  index: number;
  disabled: boolean;
  onRemove: (domain: string) => void;
}

export function DomainItem({ domain, index, disabled, onRemove }: DomainItemProps) {
  return (
    <li>
      <span className="domain-index">{String(index + 1).padStart(2, "0")}</span>
      <span>{domain}</span>
      <button
        type="button"
        aria-label={`Remover ${domain}`}
        onClick={() => onRemove(domain)}
        disabled={disabled}
      >
        ×
      </button>
    </li>
  );
}

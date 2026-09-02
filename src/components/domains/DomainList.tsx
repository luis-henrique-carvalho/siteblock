import { DomainItem } from "./DomainItem";

interface DomainListProps {
  domains: string[];
  disabled: boolean;
  onRemoveDomain: (domain: string) => void;
}

export function DomainList({ domains, disabled, onRemoveDomain }: DomainListProps) {
  return (
    <ul className="domain-list">
      {domains.length === 0 && <li className="empty-state">Sua lista ainda está vazia.</li>}
      {domains.map((domain, index) => (
        <DomainItem
          key={domain}
          domain={domain}
          index={index}
          disabled={disabled}
          onRemove={onRemoveDomain}
        />
      ))}
    </ul>
  );
}

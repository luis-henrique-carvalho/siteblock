import { useState, type FormEvent } from "react";

interface DomainFormProps {
  disabled: boolean;
  onAddDomain: (domain: string) => Promise<boolean>;
}

export function DomainForm({ disabled, onAddDomain }: DomainFormProps) {
  const [newDomain, setNewDomain] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDomain.trim()) return;

    const success = await onAddDomain(newDomain);
    if (success) {
      setNewDomain("");
    }
  };

  return (
    <form className="domain-form" onSubmit={(e) => void handleSubmit(e)}>
      <input
        type="text"
        value={newDomain}
        onChange={(e) => setNewDomain(e.target.value)}
        placeholder="ex.: reddit.com"
        aria-label="Novo domínio"
        disabled={disabled}
      />
      <button type="submit" disabled={disabled}>
        Adicionar
      </button>
    </form>
  );
}

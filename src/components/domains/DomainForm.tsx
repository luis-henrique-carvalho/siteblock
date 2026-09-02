import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
    <form className="domain-form flex items-center gap-2" onSubmit={(e) => void handleSubmit(e)}>
      <Input
        type="text"
        value={newDomain}
        onChange={(e) => setNewDomain(e.target.value)}
        placeholder="ex.: reddit.com"
        aria-label="Novo domínio"
        disabled={disabled}
        className="h-9 text-sm"
      />
      <Button type="submit" disabled={disabled} className="h-9 gap-1.5 px-4 font-semibold shrink-0">
        <Plus className="size-4" aria-hidden="true" />
        Adicionar
      </Button>
    </form>
  );
}

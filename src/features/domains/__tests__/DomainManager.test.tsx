import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DomainManager } from "../components/DomainManager";

describe("DomainManager", () => {
  const domains = ["reddit.com", "twitter.com"];

  it("renders domain list and counter correctly", () => {
    render(
      <DomainManager
        domains={domains}
        disabled={false}
        onAddDomain={vi.fn()}
        onRemoveDomain={vi.fn()}
      />,
    );

    expect(screen.getByText("2 destinos")).toBeInTheDocument();
    expect(screen.getByLabelText("Total: 2 domínios")).toHaveTextContent("02");
    expect(screen.getByText("reddit.com")).toBeInTheDocument();
    expect(screen.getByText("twitter.com")).toBeInTheDocument();
  });

  it("shows empty state when no domains are configured", () => {
    render(
      <DomainManager
        domains={[]}
        disabled={false}
        onAddDomain={vi.fn()}
        onRemoveDomain={vi.fn()}
      />,
    );

    expect(screen.getByText("Sua lista ainda está vazia.")).toBeInTheDocument();
  });

  it("submits new domain and resets input on success", async () => {
    const handleAdd = vi.fn().mockResolvedValue(true);
    render(
      <DomainManager
        domains={domains}
        disabled={false}
        onAddDomain={handleAdd}
        onRemoveDomain={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("ex.: reddit.com");
    const submitBtn = screen.getByRole("button", { name: /adicionar/i });

    await userEvent.type(input, "instagram.com");
    await userEvent.click(submitBtn);

    expect(handleAdd).toHaveBeenCalledWith("instagram.com");
    expect(input).toHaveValue("");
  });

  it("calls onRemoveDomain when clicking remove button", async () => {
    const handleRemove = vi.fn();
    render(
      <DomainManager
        domains={domains}
        disabled={false}
        onAddDomain={vi.fn()}
        onRemoveDomain={handleRemove}
      />,
    );

    const removeBtn = screen.getByRole("button", { name: "Remover reddit.com" });
    await userEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith("reddit.com");
  });
});

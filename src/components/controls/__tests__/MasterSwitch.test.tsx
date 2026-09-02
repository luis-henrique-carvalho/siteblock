import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MasterSwitch } from "../MasterSwitch";

describe("MasterSwitch", () => {
  it("renders enabled state correctly", () => {
    render(<MasterSwitch enabled={true} disabled={false} onToggle={vi.fn()} />);

    expect(screen.getByText("Proteção habilitada")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /desativar/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("renders disabled (paused) state correctly", () => {
    render(<MasterSwitch enabled={false} disabled={false} onToggle={vi.fn()} />);

    expect(screen.getByText("Proteção em pausa")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /ativar/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("triggers onToggle callback when clicked", async () => {
    const handleToggle = vi.fn();
    render(<MasterSwitch enabled={false} disabled={false} onToggle={handleToggle} />);

    const button = screen.getByRole("button", { name: /ativar/i });
    await userEvent.click(button);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("disables button when disabled prop is true", () => {
    render(<MasterSwitch enabled={false} disabled={true} onToggle={vi.fn()} />);

    const button = screen.getByRole("button", { name: /ativar/i });
    expect(button).toBeDisabled();
  });
});

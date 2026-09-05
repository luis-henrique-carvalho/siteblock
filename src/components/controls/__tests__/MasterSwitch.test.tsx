import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MasterSwitch } from "../MasterSwitch";

describe("MasterSwitch", () => {
  it("renders enabled state correctly", () => {
    render(<MasterSwitch enabled={true} disabled={false} onToggle={vi.fn()} />);

    expect(screen.getByText("Proteção habilitada")).toBeInTheDocument();
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("renders disabled (paused) state correctly", () => {
    render(<MasterSwitch enabled={false} disabled={false} onToggle={vi.fn()} />);

    expect(screen.getByText("Proteção em pausa")).toBeInTheDocument();
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("triggers onToggle callback when clicked", async () => {
    const handleToggle = vi.fn();
    render(<MasterSwitch enabled={false} disabled={false} onToggle={handleToggle} />);

    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("disables switch when disabled prop is true", () => {
    render(<MasterSwitch enabled={false} disabled={true} onToggle={vi.fn()} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeDisabled();
  });
});

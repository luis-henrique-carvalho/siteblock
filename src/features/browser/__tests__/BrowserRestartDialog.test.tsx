import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BrowserRestartDialog } from "../components/BrowserRestartDialog";
import { LanguageProvider } from "@/i18n";

describe("BrowserRestartDialog", () => {
  it("renders dialog with browser-specific title and description when open", () => {
    render(
      <LanguageProvider>
        <BrowserRestartDialog open={true} onOpenChange={vi.fn()} browserName="Firefox" />
      </LanguageProvider>,
    );

    expect(screen.getByText("Reinício do Firefox necessário")).toBeInTheDocument();
    expect(
      screen.getByText(/Firefox aplica novas políticas apenas ao ser iniciado/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entendi" })).toBeInTheDocument();
  });

  it("calls onOpenChange with false when 'Entendi' button is clicked", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <LanguageProvider>
        <BrowserRestartDialog open={true} onOpenChange={handleOpenChange} browserName="Floorp" />
      </LanguageProvider>,
    );

    expect(screen.getByText("Reinício do Floorp necessário")).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "Entendi" });
    await user.click(confirmButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});

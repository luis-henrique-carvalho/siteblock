import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BrowserStatusList } from "../BrowserStatusList";
import { LanguageProvider } from "../../../i18n";
import type { BrowserIntegration } from "../../../types/siteblock";

const mockIntegrations: BrowserIntegration[] = [
  {
    name: "Chrome",
    detected: true,
    enabled: true,
    policyReady: true,
    mode: "Política gerenciada",
  },
  {
    name: "Brave",
    detected: false,
    enabled: false,
    policyReady: false,
    mode: "Desativado nas configurações",
  },
  {
    name: "Firefox",
    detected: true,
    enabled: false,
    policyReady: false,
    mode: "Desativado nas configurações",
  },
];

describe("BrowserStatusList & BrowserItem", () => {
  it("renders all browser names and statuses without errors", () => {
    render(
      <LanguageProvider>
        <BrowserStatusList integrations={mockIntegrations} />
      </LanguageProvider>,
    );

    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("Brave")).toBeInTheDocument();
    expect(screen.getByText("Firefox")).toBeInTheDocument();

    // Chrome is active
    expect(screen.getByText("Políticas ativas")).toBeInTheDocument();

    // Firefox is disabled
    expect(screen.getByText("Desativado")).toBeInTheDocument();

    // Brave is not installed (badge + status)
    expect(screen.getAllByText("Não instalado").length).toBeGreaterThan(0);
  });

  it("calls onToggleBrowser when switch is flipped", async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();

    render(
      <LanguageProvider>
        <BrowserStatusList
          integrations={mockIntegrations}
          onToggleBrowser={handleToggle}
        />
      </LanguageProvider>,
    );

    // Chrome switch is checked
    const chromeSwitch = screen.getByRole("switch", {
      name: /chrome/i,
    });
    expect(chromeSwitch).toBeInTheDocument();
    expect(chromeSwitch).toHaveAttribute("aria-checked", "true");

    await user.click(chromeSwitch);
    expect(handleToggle).toHaveBeenCalledWith("Chrome", false);

    // Firefox switch is unchecked
    const firefoxSwitch = screen.getByRole("switch", {
      name: /firefox/i,
    });
    expect(firefoxSwitch).toBeInTheDocument();
    expect(firefoxSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(firefoxSwitch);
    expect(handleToggle).toHaveBeenCalledWith("Firefox", true);
  });

  it("triggers onOpenPreferences when settings button is clicked", async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();

    render(
      <LanguageProvider>
        <BrowserStatusList
          integrations={mockIntegrations}
          onOpenPreferences={handleOpen}
        />
      </LanguageProvider>,
    );

    const configBtn = screen.getByRole("button", { name: /preferências/i });
    await user.click(configBtn);
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });
});

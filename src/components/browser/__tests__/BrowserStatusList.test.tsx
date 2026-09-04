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
    requiresRestart: false,
  },
  {
    name: "Brave",
    detected: false,
    enabled: false,
    policyReady: false,
    mode: "Desativado nas configurações",
    requiresRestart: false,
  },
  {
    name: "Firefox",
    detected: true,
    enabled: false,
    policyReady: false,
    mode: "Desativado nas configurações",
    requiresRestart: true,
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

  it("opens BrowserRestartDialog when a browser with requiresRestart: true is enabled", async () => {
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

    const firefoxSwitch = screen.getByRole("switch", { name: /firefox/i });
    await user.click(firefoxSwitch);

    expect(handleToggle).toHaveBeenCalledWith("Firefox", true);
    expect(screen.getByText("Reinício do Firefox necessário")).toBeInTheDocument();
    expect(
      screen.getByText(/Firefox aplica novas políticas apenas ao ser iniciado/),
    ).toBeInTheDocument();

    // Clicking "Entendi" closes the dialog
    const confirmBtn = screen.getByRole("button", { name: "Entendi" });
    await user.click(confirmBtn);
    expect(screen.queryByText("Reinício do Firefox necessário")).not.toBeInTheDocument();
  });

  it("does not open BrowserRestartDialog when a browser without requiresRestart is disabled", async () => {
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

    const chromeSwitch = screen.getByRole("switch", { name: /chrome/i });
    await user.click(chromeSwitch);

    expect(handleToggle).toHaveBeenCalledWith("Chrome", false);
    expect(screen.queryByText(/Reinício do Chrome necessário/i)).not.toBeInTheDocument();
  });

  it("renders 'Requer reinício' badge when browser has requiresRestart: true and is enabled", () => {
    const integrationsWithRestartEnabled: BrowserIntegration[] = [
      {
        name: "Firefox",
        detected: true,
        enabled: true,
        policyReady: true,
        mode: "Política gerenciada",
        requiresRestart: true,
      },
    ];

    render(
      <LanguageProvider>
        <BrowserStatusList integrations={integrationsWithRestartEnabled} />
      </LanguageProvider>,
    );

    const badge = screen.getByText("Requer reinício");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("title", "Requer reiniciar o Firefox se já estiver aberto.");
  });
});

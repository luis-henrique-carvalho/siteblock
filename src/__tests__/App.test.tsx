import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

const mockStatus = {
  active: true,
  enabled: true,
  domains: ["reddit.com"],
  schedules: [],
  helperInstalled: true,
  sessionSupported: true,
  revision: 1,
  browserIntegrations: [
    {
      name: "Google Chrome",
      detected: true,
      policyReady: true,
      mode: "Política gerenciada",
    },
  ],
};

describe("App Integration", () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "get_siteblock_status") return mockStatus;
      if (cmd === "start_privileged_session") return mockStatus;
      if (cmd === "save_siteblock_config") return mockStatus;
      return mockStatus;
    });
  });

  it("renders full application when state is loaded", async () => {
    render(<App />);

    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "Carregando o painel de proteção…",
    );

    await waitFor(() => {
      expect(screen.getByText("SiteBlock")).toBeInTheDocument();
    });

    expect(screen.getByText("Sistema em proteção")).toBeInTheDocument();
    expect(screen.getByText("Google Chrome")).toBeInTheDocument();
    expect(screen.getByText("reddit.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desativar/i })).toBeInTheDocument();
  });

  it("allows adding a domain through the UI", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("SiteBlock")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("ex.: reddit.com");
    const addBtn = screen.getByRole("button", { name: /adicionar/i });

    await userEvent.type(input, "twitter.com");
    await userEvent.click(addBtn);

    expect(mockInvoke).toHaveBeenCalledWith(
      "save_siteblock_config",
      expect.objectContaining({
        config: expect.objectContaining({
          domains: ["reddit.com", "twitter.com"],
        }),
      }),
    );
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { PreferencesPanel } from "../PreferencesPanel";

const storeValues = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    get<T>(key: string) {
      return Promise.resolve(storeValues.get(key) as T | undefined);
    }

    set(key: string, value: unknown) {
      storeValues.set(key, value);
      return Promise.resolve();
    }
  },
}));

describe("PreferencesPanel", () => {
  beforeEach(() => {
    storeValues.clear();
    window.localStorage.clear();
  });

  it("changes the interface language and persists the preference in the Tauri store", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <PreferencesPanel open onOpenChange={() => undefined} />
      </LanguageProvider>,
    );

    await user.selectOptions(screen.getByLabelText("Idioma"), "en");

    expect(screen.getByRole("heading", { name: "Application interface" })).toBeInTheDocument();
    await waitFor(() => expect(storeValues.get("language")).toBe("en"));
  });

  it("migrates the previous localStorage language preference to the Tauri store", async () => {
    window.localStorage.setItem("siteblock.preferences.language", "en");

    render(
      <LanguageProvider>
        <PreferencesPanel open onOpenChange={() => undefined} />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Application interface" })).toBeInTheDocument();
      expect(storeValues.get("language")).toBe("en");
    });
    expect(window.localStorage.getItem("siteblock.preferences.language")).toBeNull();
  });
});

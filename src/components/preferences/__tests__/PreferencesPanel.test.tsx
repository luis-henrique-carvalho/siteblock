import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { PreferencesPanel } from "../PreferencesPanel";

describe("PreferencesPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("changes the interface language and persists the preference locally", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <PreferencesPanel />
      </LanguageProvider>,
    );

    await user.selectOptions(screen.getByLabelText("Idioma"), "en");

    expect(screen.getByRole("heading", { name: "Application interface" })).toBeInTheDocument();
    expect(window.localStorage.getItem("siteblock.preferences.language")).toBe("en");
  });
});

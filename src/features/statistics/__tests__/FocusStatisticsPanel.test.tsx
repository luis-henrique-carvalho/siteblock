import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n";
import { FocusStatisticsPanel } from "../components/FocusStatisticsPanel";

const profiles = [
  {
    id: "focus",
    name: "Foco",
    icon: "target",
    color: "blue",
    enabled: true,
    domains: ["youtube.com"],
    schedules: [],
  },
];

describe("FocusStatisticsPanel", () => {
  it("loads the general seven-day statistics and reapplies the query for a profile filter", async () => {
    const getFocusStatistics = vi.fn().mockResolvedValue({
      protectedSeconds: 3_600,
      completedSessions: 1,
      daily: [{ date: "2026-09-03", protectedSeconds: 3_600 }],
      domains: [{ domain: "youtube.com", protectedSeconds: 3_600, completedSessions: 1 }],
    });
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <FocusStatisticsPanel profiles={profiles} api={{ getFocusStatistics }} available />
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getAllByText("1 h")).toHaveLength(2));
    expect(getFocusStatistics).toHaveBeenCalledWith(
      expect.not.objectContaining({ profileId: expect.anything() }),
    );
    expect(screen.getByText("youtube.com")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Perfil das estatísticas" }));
    await user.click(await screen.findByRole("option", { name: "Foco" }));

    await waitFor(() =>
      expect(getFocusStatistics).toHaveBeenLastCalledWith(
        expect.objectContaining({ profileId: "focus" }),
      ),
    );
  });

  it("explains the empty history and offers a retry after a loading error", async () => {
    const empty = vi
      .fn()
      .mockResolvedValue({ protectedSeconds: 0, completedSessions: 0, daily: [], domains: [] });
    const { rerender } = render(
      <LanguageProvider>
        <FocusStatisticsPanel profiles={profiles} api={{ getFocusStatistics: empty }} available />
      </LanguageProvider>,
    );

    await screen.findByText("Seu histórico está começando");

    const failed = vi.fn().mockRejectedValue(new Error("helper unavailable"));
    rerender(
      <LanguageProvider>
        <FocusStatisticsPanel profiles={profiles} api={{ getFocusStatistics: failed }} available />
      </LanguageProvider>,
    );

    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(failed).toHaveBeenCalledTimes(2);
  });
});

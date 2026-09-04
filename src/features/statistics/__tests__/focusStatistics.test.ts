import { describe, expect, it } from "vitest";
import { createFocusStatisticsQuery, formatFocusDuration } from "../utils/focusStatistics";

const durationLabels = { hour: "h", minute: "min" };

describe("focusStatistics utilities", () => {
  it("builds the inclusive date range for a selected period and profile", () => {
    expect(createFocusStatisticsQuery(7, "focus", new Date(2026, 8, 7))).toEqual({
      from: "2026-09-01",
      to: "2026-09-07",
      profileId: "focus",
    });
  });

  it("formats protected time without exposing raw seconds", () => {
    expect(formatFocusDuration(0, durationLabels)).toBe("0 min");
    expect(formatFocusDuration(3_660, durationLabels)).toBe("1 h 1 min");
  });
});

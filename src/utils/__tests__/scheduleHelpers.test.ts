import { describe, expect, it } from "vitest";
import { createEmptySchedule, getScheduleSummary, toggleScheduleDay } from "../scheduleHelpers";

describe("scheduleHelpers", () => {
  describe("createEmptySchedule", () => {
    it("should generate a valid default schedule with 5 weekdays", () => {
      const schedule = createEmptySchedule();
      expect(schedule.id).toBeDefined();
      expect(schedule.days).toEqual([0, 1, 2, 3, 4]);
      expect(schedule.start).toBe("09:00");
      expect(schedule.end).toBe("18:00");
    });
  });

  describe("toggleScheduleDay", () => {
    it("should add a missing day and keep days sorted", () => {
      const initial = [0, 2, 4];
      const result = toggleScheduleDay(initial, 1);
      expect(result).toEqual([0, 1, 2, 4]);
    });

    it("should remove an existing day", () => {
      const initial = [0, 1, 2, 3, 4];
      const result = toggleScheduleDay(initial, 2);
      expect(result).toEqual([0, 1, 3, 4]);
    });
  });

  describe("getScheduleSummary", () => {
    it("should return message for 0 schedules", () => {
      expect(getScheduleSummary(0)).toBe("Sem horários: o bloqueio depende apenas do botão acima.");
    });

    it("should return singular message for 1 schedule", () => {
      expect(getScheduleSummary(1)).toBe("1 período configurado.");
    });

    it("should return plural message for multiple schedules", () => {
      expect(getScheduleSummary(3)).toBe("3 períodos configurados.");
    });
  });
});

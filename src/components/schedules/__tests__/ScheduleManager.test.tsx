import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScheduleManager } from "../ScheduleManager";
import type { Schedule } from "../../../types/schedule";

describe("ScheduleManager", () => {
  const initialSchedules: Schedule[] = [
    {
      id: "rule-1",
      days: [0, 1, 2],
      start: "09:00",
      end: "17:00",
    },
  ];

  it("renders existing schedules list", () => {
    render(
      <ScheduleManager
        schedules={initialSchedules}
        disabled={false}
        onUpdateSchedules={vi.fn()}
        onSaveSchedules={vi.fn()}
      />,
    );

    expect(screen.getByText("Agenda semanal")).toBeInTheDocument();
    expect(screen.getByText("PERÍODO 01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar agenda" })).toBeInTheDocument();
  });

  it("triggers adding a new schedule", async () => {
    const handleUpdate = vi.fn();
    render(
      <ScheduleManager
        schedules={[]}
        disabled={false}
        onUpdateSchedules={handleUpdate}
        onSaveSchedules={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Sem períodos automáticos. A chave mestra controla tudo."),
    ).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: "+ Novo período" });
    await userEvent.click(addBtn);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
  });

  it("triggers save schedules callback", async () => {
    const handleSave = vi.fn();
    render(
      <ScheduleManager
        schedules={initialSchedules}
        disabled={false}
        onUpdateSchedules={vi.fn()}
        onSaveSchedules={handleSave}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: "Salvar agenda" });
    await userEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
  });
});

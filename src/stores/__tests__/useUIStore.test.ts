import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "../useUIStore";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  it("has expected initial state", () => {
    const state = useUIStore.getState();
    expect(state.preferencesOpen).toBe(false);
    expect(state.aboutOpen).toBe(false);
    expect(state.busy).toBe(false);
    expect(state.message).toBe("");
    expect(state.integrationRequired).toBe(false);
  });

  it("updates dialog visibility states", () => {
    useUIStore.getState().setPreferencesOpen(true);
    expect(useUIStore.getState().preferencesOpen).toBe(true);

    useUIStore.getState().setAboutOpen(true);
    expect(useUIStore.getState().aboutOpen).toBe(true);

    useUIStore.getState().setPreferencesOpen(false);
    expect(useUIStore.getState().preferencesOpen).toBe(false);
  });

  it("updates feedback and status flags", () => {
    useUIStore.getState().setBusy(true);
    useUIStore.getState().setMessage("Salvo com sucesso");
    useUIStore.getState().setIntegrationRequired(true);

    const state = useUIStore.getState();
    expect(state.busy).toBe(true);
    expect(state.message).toBe("Salvo com sucesso");
    expect(state.integrationRequired).toBe(true);
  });

  it("resets state back to initial", () => {
    useUIStore.getState().setPreferencesOpen(true);
    useUIStore.getState().setBusy(true);
    useUIStore.getState().setMessage("Em andamento");

    useUIStore.getState().reset();

    const state = useUIStore.getState();
    expect(state.preferencesOpen).toBe(false);
    expect(state.busy).toBe(false);
    expect(state.message).toBe("");
  });
});

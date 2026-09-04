import { create } from "zustand";

export interface UIState {
  preferencesOpen: boolean;
  aboutOpen: boolean;
  busy: boolean;
  message: string;
  integrationRequired: boolean;
  setPreferencesOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setBusy: (busy: boolean) => void;
  setMessage: (msg: string) => void;
  setIntegrationRequired: (required: boolean) => void;
  reset: () => void;
}

const initialState = {
  preferencesOpen: false,
  aboutOpen: false,
  busy: false,
  message: "",
  integrationRequired: false,
};

export const useUIStore = create<UIState>((set) => ({
  ...initialState,
  setPreferencesOpen: (open) => set({ preferencesOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setBusy: (busy) => set({ busy }),
  setMessage: (message) => set({ message }),
  setIntegrationRequired: (integrationRequired) => set({ integrationRequired }),
  reset: () => set({ ...initialState }),
}));

import { create } from "zustand";
import { toast } from "sonner";

export type NotificationType = "success" | "error" | "warning" | "info";

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
  notify: (type: NotificationType, message: string) => void;
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
  notify: (type, message) => {
    if (!message) return;
    set({ message });
    toast[type](message);
  },
  reset: () => set({ ...initialState }),
}));

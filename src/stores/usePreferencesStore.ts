import { create } from "zustand";
import { LazyStore } from "@tauri-apps/plugin-store";
import {
  LANGUAGES,
  type Language,
  type Translate,
  type TranslationKey,
  translate,
} from "../i18n/translations";

const LANGUAGE_KEY = "language";
const LEGACY_STORAGE_KEY = "siteblock.preferences.language";

const preferencesStore = new LazyStore("settings.json", { autoSave: 250 });

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGES.includes(value as Language);
}

function getLegacyLanguage(): Language | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return isLanguage(value) ? value : undefined;
}

export interface PreferencesState {
  language: Language;
  hasPersistenceError: boolean;
  initialized: boolean;
  setLanguage: (language: Language) => void;
  init: () => Promise<void>;
  t: Translate;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  language: "pt-BR",
  hasPersistenceError: false,
  initialized: false,

  t: (key: TranslationKey, values?: Record<string, string | number>) => {
    return translate(get().language, key, values);
  },

  setLanguage: (nextLanguage: Language) => {
    set({ language: nextLanguage, hasPersistenceError: false });

    void preferencesStore.set(LANGUAGE_KEY, nextLanguage).catch((error: unknown) => {
      console.warn("Não foi possível salvar as preferências locais.", error);
      set({ hasPersistenceError: true });
    });
  },

  init: async () => {
    try {
      const savedLanguage = await preferencesStore.get<unknown>(LANGUAGE_KEY);
      const storedLanguage = isLanguage(savedLanguage) ? savedLanguage : undefined;
      const legacyLanguage = getLegacyLanguage();
      const nextLanguage = storedLanguage ?? legacyLanguage ?? "pt-BR";

      if (!storedLanguage && legacyLanguage) {
        await preferencesStore.set(LANGUAGE_KEY, legacyLanguage);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }

      set({ language: nextLanguage, initialized: true, hasPersistenceError: false });
    } catch (error) {
      console.warn("Não foi possível carregar as preferências locais.", error);
      const legacyLanguage = getLegacyLanguage();
      set({
        language: legacyLanguage ?? "pt-BR",
        initialized: true,
        hasPersistenceError: true,
      });
    }
  },
}));

export function getTranslation(key: TranslationKey, values?: Record<string, string | number>): string {
  return usePreferencesStore.getState().t(key, values);
}

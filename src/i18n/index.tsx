/* eslint-disable react-refresh/only-export-components -- The translation catalog and its React provider form one public module. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  LANGUAGES,
  type Language,
  type Translate,
  type TranslationKey,
  translate,
} from "./translations";
import { usePreferencesStore } from "../stores/usePreferencesStore";

export {
  LANGUAGES,
  type Language,
  type Translate,
  type TranslationKey,
  translate,
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  hasPersistenceError: boolean;
  t: Translate;
}

const defaultContext: LanguageContextValue = {
  language: "pt-BR",
  setLanguage: () => undefined,
  hasPersistenceError: false,
  t: (key, values) => translate("pt-BR", key, values),
};

const LanguageContext = createContext<LanguageContextValue>(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const hasPersistenceError = usePreferencesStore((s) => s.hasPersistenceError);
  const init = usePreferencesStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      hasPersistenceError,
      t: (key, values) => translate(language, key, values),
    }),
    [hasPersistenceError, language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

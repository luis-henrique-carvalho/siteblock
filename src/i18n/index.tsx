/* eslint-disable react-refresh/only-export-components -- The translation catalog and its React provider form one public module. */
import { LazyStore } from "@tauri-apps/plugin-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const LANGUAGES = ["pt-BR", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

const LANGUAGE_KEY = "language";
const LEGACY_STORAGE_KEY = "siteblock.preferences.language";

// A LazyStore keeps this file in Tauri's per-user app data directory and only
// opens it on first access. Blocking rules intentionally remain in the
// privileged system configuration managed by the Rust backend.
const preferencesStore = new LazyStore("settings.json", { autoSave: 250 });

const translations = {
  "pt-BR": {
    "app.loading": "Carregando o painel de proteção…",
    "status.protected": "Sistema em proteção",
    "status.paused": "Sistema em pausa",
    "setup.title": "Configure a integração do sistema.",
    "setup.description": "Autorize agora para preparar o bloqueio e os navegadores.",
    "setup.action": "Configurar agora",
    "setup.loading": "Configurando…",
    "browser.eyebrow": "PROTEÇÃO NOS NAVEGADORES",
    "browser.label": "Integração com navegadores",
    "browser.description":
      "Políticas nativas aplicadas diretamente no Chrome, Brave e Firefox para garantir o bloqueio.",
    "browser.empty": "Nenhum navegador suportado detectado.",
    "browser.notInstalled": "Não instalado",
    "browser.active": "Políticas ativas",
    "browser.waiting": "Sincronizando…",
    "browser.disabled": "Desativado",
    "browser.configure": "Preferências",
    "browser.toggleHint": "Ativar ou desativar proteção no {browser}",
    "topbar.settings": "Configurações",
    "topbar.settingsAria": "Abrir preferências locais",
    "hero.eyebrow": "CONTROLE DE ACESSO",
    "hero.titleBefore": "Seu foco tem um",
    "hero.titleEmphasis": "perímetro.",
    "hero.description":
      "Defina os destinos que interrompem seu ritmo e deixe o SiteBlock cuidar do horário.",
    "shield.blocking": "Bloqueando agora",
    "shield.allowed": "Acesso liberado",
    "shield.status": "Status do escudo: {status}",
    "shield.enableHint": "Ative o bloqueio para aplicar as regras.",
    "master.eyebrow": "CHAVE MESTRA",
    "master.enabled": "Proteção habilitada",
    "master.disabled": "Proteção em pausa",
    "master.enabledHint": "As regras e horários abaixo estão valendo.",
    "master.disabledHint": "Nenhum site será bloqueado até você reativar.",
    "master.switchLabel": "Alternar proteção mestre",
    "master.disable": "Desativar",
    "master.enable": "Ativar",
    "domains.eyebrow": "LISTA DE BLOQUEIO",
    "domains.destinations": "{count} destinos",
    "domains.total": "Total: {count} domínios",
    "domains.placeholder": "ex.: reddit.com",
    "domains.new": "Novo domínio",
    "domains.add": "Adicionar",
    "domains.empty": "Sua lista ainda está vazia.",
    "domains.remove": "Remover {domain}",
    "schedule.eyebrow": "JANELAS DE FOCO",
    "schedule.title": "Agenda semanal",
    "schedule.add": "+ Novo período",
    "schedule.empty": "Sem períodos automáticos. A chave mestra controla tudo.",
    "schedule.save": "Salvar agenda",
    "schedule.period": "PERÍODO {number}",
    "schedule.periodLabel": "Período {number}",
    "schedule.remove": "Remover",
    "schedule.removeLabel": "Remover período {number}",
    "schedule.weekdays": "Dias da semana",
    "weekday.mon": "Seg",
    "weekday.tue": "Ter",
    "weekday.wed": "Qua",
    "weekday.thu": "Qui",
    "weekday.fri": "Sex",
    "weekday.sat": "Sáb",
    "weekday.sun": "Dom",
    "schedule.start": "Início",
    "schedule.end": "Fim",
    "schedule.startLabel": "Horário de início",
    "schedule.endLabel": "Horário de fim",
    "schedule.summaryNone": "Sem horários: o bloqueio depende apenas do botão acima.",
    "schedule.summaryOne": "1 período configurado.",
    "schedule.summaryMany": "{count} períodos configurados.",
    "preferences.eyebrow": "PREFERÊNCIAS LOCAIS",
    "preferences.title": "Configurações",
    "preferences.description":
      "Personalize a interface e defina quais navegadores recebem as políticas de bloqueio.",
    "preferences.language": "Idioma",
    "preferences.languageDescription": "Aplique o idioma à interface do SiteBlock.",
    "preferences.browsers": "Navegadores",
    "preferences.browsersDescription":
      "Selecione os navegadores que receberão as políticas de bloqueio. A proteção pelo sistema continua cobrindo todos os aplicativos.",
    "preferences.browserDetected": "Detectado neste computador",
    "preferences.browserNotDetected": "Não detectado neste computador",
    "preferences.browserToggle": "Ativar bloqueio no {browser}",
    "preferences.browserSetupRequired":
      "Configure a integração do sistema para escolher os navegadores.",
    "preferences.saved": "Salvo neste dispositivo",
    "preferences.saveError": "Não foi possível salvar a preferência neste dispositivo.",
    "preferences.close": "Fechar",
    "about.title": "Sobre o SiteBlock",
    "about.description": "Um painel local para proteger seu foco com bloqueios e horários.",
    "about.version": "Versão 0.1.0",
    "footer.description":
      "Autorização solicitada uma vez por abertura do app, ou ao atualizar a integração. Alterações da lista são aplicadas automaticamente.",
    "message.integrationUpdate": "A integração do SiteBlock precisa ser atualizada uma vez.",
    "message.blockingEnabled": "Bloqueio ativado.",
    "message.blockingDisabled": "Bloqueio desativado.",
    "message.integrationConfigured":
      "Integração configurada. Reinicie o Chrome ou Brave uma única vez para carregar a extensão; depois, use somente esta interface.",
    "profiles.eyebrow": "PERFIS DE BLOQUEIO",
    "profiles.activeCount": "{active} de {total} perfis ativos",
    "profiles.new": "Novo perfil",
    "profiles.createTitle": "Novo perfil de bloqueio",
    "profiles.editTitle": "Editar perfil",
    "profiles.nameLabel": "Nome do perfil",
    "profiles.namePlaceholder": "Ex: Trabalho, Games",
    "profiles.iconLabel": "Ícone",
    "profiles.colorLabel": "Cor de destaque",
    "profiles.save": "Salvar alterações",
    "profiles.create": "Criar perfil",
    "profiles.cancel": "Cancelar",
    "profiles.delete": "Excluir perfil",
    "profiles.duplicate": "Duplicar perfil",
    "profiles.activeNow": "Bloqueando agora",
    "profiles.outsideSchedule": "Fora do horário",
    "profiles.disabled": "Desativado",
    "message.profileCreated": 'Perfil "{name}" criado.',
    "message.profileUpdated": 'Perfil "{name}" atualizado.',
    "message.profileDeleted": "Perfil removido.",
    "message.profileCannotDeleteLast": "Você deve manter ao menos um perfil de bloqueio.",
    "message.domainAdded": "{domain} adicionado.",
    "message.domainRemoved": "{domain} removido.",
    "message.scheduleUpdated": "Agenda atualizada.",
    "message.browserSettingsUpdated": "Configurações dos navegadores atualizadas.",
  },
  en: {
    "app.loading": "Loading the protection dashboard…",
    "status.protected": "System protected",
    "status.paused": "System paused",
    "setup.title": "Set up the system integration.",
    "setup.description": "Authorize it now to prepare blocking and your browsers.",
    "setup.action": "Set up now",
    "setup.loading": "Setting up…",
    "browser.eyebrow": "BROWSER ENFORCEMENT",
    "browser.label": "Browser integration",
    "browser.description":
      "Native policies applied directly to Chrome, Brave, and Firefox to enforce blocking rules.",
    "browser.empty": "No supported browsers detected.",
    "browser.notInstalled": "Not installed",
    "browser.active": "Policy active",
    "browser.waiting": "Syncing…",
    "browser.disabled": "Disabled",
    "browser.configure": "Settings",
    "browser.toggleHint": "Enable or disable protection in {browser}",
    "topbar.settings": "Settings",
    "topbar.settingsAria": "Open local preferences",
    "hero.eyebrow": "ACCESS CONTROL",
    "hero.titleBefore": "Your focus has a",
    "hero.titleEmphasis": "perimeter.",
    "hero.description":
      "Set the destinations that disrupt your rhythm and let SiteBlock handle the schedule.",
    "shield.blocking": "Blocking now",
    "shield.allowed": "Access allowed",
    "shield.status": "Shield status: {status}",
    "shield.enableHint": "Enable blocking to apply the rules.",
    "master.eyebrow": "MASTER SWITCH",
    "master.enabled": "Protection enabled",
    "master.disabled": "Protection paused",
    "master.enabledHint": "The rules and schedules below are in effect.",
    "master.disabledHint": "No website will be blocked until you turn it back on.",
    "master.switchLabel": "Toggle master protection",
    "master.disable": "Disable",
    "master.enable": "Enable",
    "domains.eyebrow": "BLOCK LIST",
    "domains.destinations": "{count} destinations",
    "domains.total": "Total: {count} domains",
    "domains.placeholder": "e.g. reddit.com",
    "domains.new": "New domain",
    "domains.add": "Add",
    "domains.empty": "Your list is still empty.",
    "domains.remove": "Remove {domain}",
    "schedule.eyebrow": "FOCUS WINDOWS",
    "schedule.title": "Weekly schedule",
    "schedule.add": "+ New window",
    "schedule.empty": "No automatic windows. The master switch controls everything.",
    "schedule.save": "Save schedule",
    "schedule.period": "WINDOW {number}",
    "schedule.periodLabel": "Window {number}",
    "schedule.remove": "Remove",
    "schedule.removeLabel": "Remove window {number}",
    "schedule.weekdays": "Days of the week",
    "weekday.mon": "Mon",
    "weekday.tue": "Tue",
    "weekday.wed": "Wed",
    "weekday.thu": "Thu",
    "weekday.fri": "Fri",
    "weekday.sat": "Sat",
    "weekday.sun": "Sun",
    "schedule.start": "Start",
    "schedule.end": "End",
    "schedule.startLabel": "Start time",
    "schedule.endLabel": "End time",
    "schedule.summaryNone": "No schedule: blocking only depends on the switch above.",
    "schedule.summaryOne": "1 window configured.",
    "schedule.summaryMany": "{count} windows configured.",
    "profiles.eyebrow": "BLOCKING PROFILES",
    "profiles.activeCount": "{active} of {total} profiles active",
    "profiles.new": "New profile",
    "profiles.createTitle": "New blocking profile",
    "profiles.editTitle": "Edit profile",
    "profiles.nameLabel": "Profile name",
    "profiles.namePlaceholder": "e.g., Work, Gaming",
    "profiles.iconLabel": "Icon",
    "profiles.colorLabel": "Accent color",
    "profiles.save": "Save changes",
    "profiles.create": "Create profile",
    "profiles.cancel": "Cancel",
    "profiles.delete": "Delete profile",
    "profiles.duplicate": "Duplicate profile",
    "profiles.activeNow": "Blocking now",
    "profiles.outsideSchedule": "Outside schedule",
    "profiles.disabled": "Disabled",
    "preferences.eyebrow": "LOCAL PREFERENCES",
    "preferences.title": "Settings",
    "preferences.description":
      "Customize the interface and choose which browsers receive blocking policies.",
    "preferences.language": "Language",
    "preferences.languageDescription": "Apply a language to the SiteBlock interface.",
    "preferences.browsers": "Browsers",
    "preferences.browsersDescription":
      "Select the browsers that receive blocking policies. System protection still covers every application.",
    "preferences.browserDetected": "Detected on this computer",
    "preferences.browserNotDetected": "Not detected on this computer",
    "preferences.browserToggle": "Enable blocking in {browser}",
    "preferences.browserSetupRequired": "Set up the system integration to choose browsers.",
    "preferences.saved": "Saved on this device",
    "preferences.saveError": "The preference could not be saved on this device.",
    "preferences.close": "Close",
    "about.title": "About SiteBlock",
    "about.description":
      "A local dashboard for protecting your focus with blocking rules and schedules.",
    "about.version": "Version 0.1.0",
    "footer.description":
      "Authorization is requested once each time the app opens, or when you update the integration. List changes apply automatically.",
    "message.integrationUpdate": "The SiteBlock integration needs to be updated once.",
    "message.blockingEnabled": "Blocking enabled.",
    "message.blockingDisabled": "Blocking disabled.",
    "message.integrationConfigured":
      "Integration configured. Restart Chrome or Brave once to load the extension; then use only this interface.",
    "message.profileCreated": 'Profile "{name}" created.',
    "message.profileUpdated": 'Profile "{name}" updated.',
    "message.profileDeleted": "Profile removed.",
    "message.profileCannotDeleteLast": "You must keep at least one blocking profile.",
    "message.domainAdded": "{domain} added.",
    "message.domainRemoved": "{domain} removed.",
    "message.scheduleUpdated": "Schedule updated.",
    "message.browserSettingsUpdated": "Browser settings updated.",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["pt-BR"];
export type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

function format(template: string, values: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function translate(
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>,
) {
  return format(translations[language][key], values);
}

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGES.includes(value as Language);
}

function getLegacyLanguage(): Language | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return isLanguage(value) ? value : undefined;
}

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
  const [language, setLanguageState] = useState<Language>("pt-BR");
  const [hasPersistenceError, setHasPersistenceError] = useState(false);
  const userSelectedLanguage = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreLanguage() {
      try {
        const savedLanguage = await preferencesStore.get<unknown>(LANGUAGE_KEY);
        const storedLanguage = isLanguage(savedLanguage) ? savedLanguage : undefined;
        const legacyLanguage = getLegacyLanguage();
        const nextLanguage = storedLanguage ?? legacyLanguage ?? "pt-BR";

        if (!storedLanguage && legacyLanguage) {
          await preferencesStore.set(LANGUAGE_KEY, legacyLanguage);
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        }

        if (!cancelled && !userSelectedLanguage.current) setLanguageState(nextLanguage);
      } catch (error) {
        console.warn("Não foi possível carregar as preferências locais.", error);
        if (!cancelled) {
          const legacyLanguage = getLegacyLanguage();
          if (legacyLanguage) setLanguageState(legacyLanguage);
          setHasPersistenceError(true);
        }
      }
    }

    void restoreLanguage();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    userSelectedLanguage.current = true;
    setLanguageState(nextLanguage);
    setHasPersistenceError(false);

    void preferencesStore.set(LANGUAGE_KEY, nextLanguage).catch((error: unknown) => {
      console.warn("Não foi possível salvar as preferências locais.", error);
      setHasPersistenceError(true);
    });
  }, []);

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

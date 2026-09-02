/* eslint-disable react-refresh/only-export-components -- The translation catalog and its React provider form one public module. */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const LANGUAGES = ["pt-BR", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = "siteblock.preferences.language";

const translations = {
  "pt-BR": {
    "app.loading": "Carregando o painel de proteção…",
    "status.protected": "Sistema em proteção",
    "status.paused": "Sistema em pausa",
    "setup.title": "Configure a integração do sistema.",
    "setup.description": "Autorize agora para preparar o bloqueio e os navegadores.",
    "setup.action": "Configurar agora",
    "setup.loading": "Configurando…",
    "browser.eyebrow": "INTEGRAÇÃO CONTÍNUA",
    "browser.label": "Integração com navegadores",
    "browser.description": "A lista é aplicada automaticamente. Chrome e Brave recebem a política no momento da mudança; a extensão elimina também páginas que já estão abertas.",
    "browser.empty": "Integração será verificada após a configuração.",
    "browser.notInstalled": "Não instalado",
    "browser.active": "Política ativa",
    "browser.waiting": "Aguardando política",
    "hero.eyebrow": "CONTROLE DE ACESSO",
    "hero.titleBefore": "Seu foco tem um",
    "hero.titleEmphasis": "perímetro.",
    "hero.description": "Defina os destinos que interrompem seu ritmo e deixe o SiteBlock cuidar do horário.",
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
    "preferences.title": "Interface do aplicativo",
    "preferences.description": "Essas escolhas ficam neste computador e não alteram as regras de bloqueio.",
    "preferences.language": "Idioma",
    "preferences.languageDescription": "Aplique o idioma à interface do SiteBlock.",
    "preferences.saved": "Salvo neste dispositivo",
    "preferences.close": "Fechar",
    "about.title": "Sobre o SiteBlock",
    "about.description": "Um painel local para proteger seu foco com bloqueios e horários.",
    "about.version": "Versão 0.1.0",
    "footer.description": "Autorização solicitada uma vez por abertura do app, ou ao atualizar a integração. Alterações da lista são aplicadas automaticamente.",
    "message.integrationUpdate": "A integração do SiteBlock precisa ser atualizada uma vez.",
    "message.blockingEnabled": "Bloqueio ativado.",
    "message.blockingDisabled": "Bloqueio desativado.",
    "message.integrationConfigured": "Integração configurada. Reinicie o Chrome ou Brave uma única vez para carregar a extensão; depois, use somente esta interface.",
    "message.domainAdded": "{domain} adicionado.",
    "message.domainRemoved": "{domain} removido.",
    "message.scheduleUpdated": "Agenda atualizada.",
  },
  en: {
    "app.loading": "Loading the protection dashboard…",
    "status.protected": "System protected",
    "status.paused": "System paused",
    "setup.title": "Set up the system integration.",
    "setup.description": "Authorize it now to prepare blocking and your browsers.",
    "setup.action": "Set up now",
    "setup.loading": "Setting up…",
    "browser.eyebrow": "CONTINUOUS INTEGRATION",
    "browser.label": "Browser integration",
    "browser.description": "The list is applied automatically. Chrome and Brave receive the policy as it changes; the extension also closes already-open pages.",
    "browser.empty": "Integration will be checked after setup.",
    "browser.notInstalled": "Not installed",
    "browser.active": "Policy active",
    "browser.waiting": "Waiting for policy",
    "hero.eyebrow": "ACCESS CONTROL",
    "hero.titleBefore": "Your focus has a",
    "hero.titleEmphasis": "perimeter.",
    "hero.description": "Set the destinations that disrupt your rhythm and let SiteBlock handle the schedule.",
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
    "preferences.eyebrow": "LOCAL PREFERENCES",
    "preferences.title": "Application interface",
    "preferences.description": "These choices stay on this computer and do not change blocking rules.",
    "preferences.language": "Language",
    "preferences.languageDescription": "Apply a language to the SiteBlock interface.",
    "preferences.saved": "Saved on this device",
    "preferences.close": "Close",
    "about.title": "About SiteBlock",
    "about.description": "A local dashboard for protecting your focus with blocking rules and schedules.",
    "about.version": "Version 0.1.0",
    "footer.description": "Authorization is requested once each time the app opens, or when you update the integration. List changes apply automatically.",
    "message.integrationUpdate": "The SiteBlock integration needs to be updated once.",
    "message.blockingEnabled": "Blocking enabled.",
    "message.blockingDisabled": "Blocking disabled.",
    "message.integrationConfigured": "Integration configured. Restart Chrome or Brave once to load the extension; then use only this interface.",
    "message.domainAdded": "{domain} added.",
    "message.domainRemoved": "{domain} removed.",
    "message.scheduleUpdated": "Schedule updated.",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["pt-BR"];
export type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

function format(template: string, values: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function translate(language: Language, key: TranslationKey, values?: Record<string, string | number>) {
  return format(translations[language][key], values);
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "pt-BR";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return LANGUAGES.includes(value as Language) ? (value as Language) : "pt-BR";
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
}

const defaultContext: LanguageContextValue = {
  language: "pt-BR",
  setLanguage: () => undefined,
  t: (key, values) => translate("pt-BR", key, values),
};

const LanguageContext = createContext<LanguageContextValue>(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      setLanguageState(nextLanguage);
    },
    t: (key, values) => translate(language, key, values),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

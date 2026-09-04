import type { Schedule } from "./schedule";

export interface Profile {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  domains: string[];
  schedules: Schedule[];
}

export interface BrowserIntegration {
  name: string;
  detected: boolean;
  enabled: boolean;
  policyReady: boolean;
  mode: string;
  requiresRestart?: boolean;
}

export interface SiteBlockState {
  active: boolean;
  enabled: boolean;
  profiles: Profile[];
  activeProfileIds: string[];
  effectiveDomains: string[];
  domains: string[];
  schedules: Schedule[];
  helperInstalled: boolean;
  sessionSupported: boolean;
  revision: number;
  browserIntegrations: BrowserIntegration[];
  enabledBrowsers: string[];
  helperOutdated?: boolean;
}

export interface SiteBlockConfigDto {
  enabled: boolean;
  profiles: Profile[];
  enabledBrowsers: string[];
  domains?: string[];
  schedules?: Schedule[];
}

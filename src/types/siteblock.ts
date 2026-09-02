import type { Schedule } from "./schedule";

export interface BrowserIntegration {
  name: string;
  detected: boolean;
  policyReady: boolean;
  mode: string;
}

export interface SiteBlockState {
  active: boolean;
  enabled: boolean;
  domains: string[];
  schedules: Schedule[];
  helperInstalled: boolean;
  sessionSupported: boolean;
  revision: number;
  browserIntegrations: BrowserIntegration[];
}

export interface SiteBlockConfigDto {
  enabled: boolean;
  domains: string[];
  schedules: Schedule[];
}

import { invoke } from "@tauri-apps/api/core";
import type { SiteBlockConfigDto, SiteBlockState } from "../types/siteblock";

export interface ISiteBlockApi {
  getStatus(): Promise<SiteBlockState>;
  startPrivilegedSession(): Promise<SiteBlockState>;
  saveConfig(config: SiteBlockConfigDto): Promise<SiteBlockState>;
  installService(): Promise<SiteBlockState>;
}

export class TauriSiteBlockApi implements ISiteBlockApi {
  async getStatus(): Promise<SiteBlockState> {
    return invoke<SiteBlockState>("get_siteblock_status");
  }

  async startPrivilegedSession(): Promise<SiteBlockState> {
    return invoke<SiteBlockState>("start_privileged_session");
  }

  async saveConfig(config: SiteBlockConfigDto): Promise<SiteBlockState> {
    return invoke<SiteBlockState>("save_siteblock_config", { config });
  }

  async installService(): Promise<SiteBlockState> {
    return invoke<SiteBlockState>("install_siteblock_service");
  }
}

export const siteblockApi: ISiteBlockApi = new TauriSiteBlockApi();

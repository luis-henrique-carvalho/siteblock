import { invoke } from "@tauri-apps/api/core";
import type { SiteBlockConfigDto, SiteBlockState } from "../types/siteblock";
import { logger } from "../utils/logger";

export interface ISiteBlockApi {
  getStatus(): Promise<SiteBlockState>;
  startPrivilegedSession(): Promise<SiteBlockState>;
  saveConfig(config: SiteBlockConfigDto): Promise<SiteBlockState>;
  installService(): Promise<SiteBlockState>;
}

export class TauriSiteBlockApi implements ISiteBlockApi {
  async getStatus(): Promise<SiteBlockState> {
    const start = performance.now();
    logger.debug("API", "Invocando get_siteblock_status");
    try {
      const state = await invoke<SiteBlockState>("get_siteblock_status");
      logger.debug(
        "API",
        `get_siteblock_status retornou em ${(performance.now() - start).toFixed(1)}ms`,
        {
          active: state.active,
          enabled: state.enabled,
        },
      );
      return state;
    } catch (error) {
      logger.error(
        "API",
        `Falha em get_siteblock_status após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }

  async startPrivilegedSession(): Promise<SiteBlockState> {
    const start = performance.now();
    logger.info("API", "Invocando start_privileged_session");
    try {
      const state = await invoke<SiteBlockState>("start_privileged_session");
      logger.info(
        "API",
        `start_privileged_session concluído em ${(performance.now() - start).toFixed(1)}ms`,
      );
      return state;
    } catch (error) {
      logger.warn(
        "API",
        `start_privileged_session falhou após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }

  async saveConfig(config: SiteBlockConfigDto): Promise<SiteBlockState> {
    const start = performance.now();
    logger.info("API", "Invocando save_siteblock_config", {
      enabled: config.enabled,
      domainsCount: config.domains.length,
      schedulesCount: config.schedules.length,
    });
    try {
      const state = await invoke<SiteBlockState>("save_siteblock_config", { config });
      logger.info(
        "API",
        `save_siteblock_config concluído em ${(performance.now() - start).toFixed(1)}ms (revision: ${state.revision})`,
      );
      return state;
    } catch (error) {
      logger.error(
        "API",
        `save_siteblock_config falhou após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }

  async installService(): Promise<SiteBlockState> {
    const start = performance.now();
    logger.info("API", "Invocando install_siteblock_service");
    try {
      const state = await invoke<SiteBlockState>("install_siteblock_service");
      logger.info(
        "API",
        `install_siteblock_service concluído em ${(performance.now() - start).toFixed(1)}ms`,
      );
      return state;
    } catch (error) {
      logger.error(
        "API",
        `install_siteblock_service falhou após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }
}

export const siteblockApi: ISiteBlockApi = new TauriSiteBlockApi();

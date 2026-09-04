import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { SiteBlockConfigDto, SiteBlockState } from "../types/siteblock";
import type { FocusStatistics, FocusStatisticsQuery } from "@/features/statistics";
import { logger } from "../utils/logger";

export interface ISiteBlockApi {
  getStatus(): Promise<SiteBlockState>;
  startPrivilegedSession(): Promise<SiteBlockState>;
  saveConfig(config: SiteBlockConfigDto): Promise<SiteBlockState>;
  installService(): Promise<SiteBlockState>;
  getFocusStatistics?(query: FocusStatisticsQuery): Promise<FocusStatistics>;
  onStateChanged?(callback: (state: SiteBlockState) => void): Promise<() => void> | (() => void);
  onOpenPreferences?(callback: () => void): Promise<() => void> | (() => void);
  onOpenAbout?(callback: () => void): Promise<() => void> | (() => void);
}

export class TauriSiteBlockApi implements ISiteBlockApi {
  async getStatus(): Promise<SiteBlockState> {
    const start = performance.now();
    logger.debug("State", "Invocando get_siteblock_status");
    try {
      const state = await invoke<SiteBlockState>("get_siteblock_status");
      logger.debug(
        "State",
        `get_siteblock_status retornou em ${(performance.now() - start).toFixed(1)}ms`,
        {
          active: state.active,
          enabled: state.enabled,
        },
      );
      return state;
    } catch (error) {
      logger.error(
        "State",
        `Falha em get_siteblock_status após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }

  async startPrivilegedSession(): Promise<SiteBlockState> {
    const start = performance.now();
    logger.info("Session", "Invocando start_privileged_session");
    try {
      const state = await invoke<SiteBlockState>("start_privileged_session");
      logger.info(
        "Session",
        `start_privileged_session concluído em ${(performance.now() - start).toFixed(1)}ms`,
      );
      return state;
    } catch (error) {
      logger.warn(
        "Session",
        `start_privileged_session falhou após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }

  async saveConfig(config: SiteBlockConfigDto): Promise<SiteBlockState> {
    const start = performance.now();
    logger.info("Config", "Invocando save_siteblock_config", {
      enabled: config.enabled,
      profilesCount: config.profiles?.length ?? 0,
      domainsCount: config.domains?.length ?? 0,
    });
    try {
      const state = await invoke<SiteBlockState>("save_siteblock_config", { config });
      logger.info(
        "Config",
        `save_siteblock_config concluído em ${(performance.now() - start).toFixed(1)}ms (revision: ${state.revision})`,
      );
      return state;
    } catch (error) {
      logger.error(
        "Config",
        `save_siteblock_config falhou após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }

  async installService(): Promise<SiteBlockState> {
    const start = performance.now();
    logger.info("Service", "Invocando install_siteblock_service");
    try {
      const state = await invoke<SiteBlockState>("install_siteblock_service");
      logger.info(
        "Service",
        `install_siteblock_service concluído em ${(performance.now() - start).toFixed(1)}ms`,
      );
      return state;
    } catch (error) {
      logger.error(
        "Service",
        `install_siteblock_service falhou após ${(performance.now() - start).toFixed(1)}ms`,
        error,
      );
      throw error;
    }
  }

  async getFocusStatistics(query: FocusStatisticsQuery): Promise<FocusStatistics> {
    logger.debug("Statistics", "Invocando get_focus_statistics", query);
    return invoke<FocusStatistics>("get_focus_statistics", { query });
  }

  async onStateChanged(callback: (state: SiteBlockState) => void): Promise<() => void> {
    logger.debug("State", "Configurando listener para siteblock://state-changed");
    const unlisten = await listen<SiteBlockState>("siteblock://state-changed", (event) => {
      logger.debug("State", "Evento siteblock://state-changed recebido", event.payload);
      callback(event.payload);
    });
    return unlisten;
  }

  async onOpenPreferences(callback: () => void): Promise<() => void> {
    logger.debug("State", "Configurando listener para siteblock://open-preferences");
    const unlisten = await listen("siteblock://open-preferences", () => {
      callback();
    });
    return unlisten;
  }

  async onOpenAbout(callback: () => void): Promise<() => void> {
    logger.debug("State", "Configurando listener para siteblock://open-about");
    const unlisten = await listen("siteblock://open-about", () => {
      callback();
    });
    return unlisten;
  }
}

export const siteblockApi: ISiteBlockApi = new TauriSiteBlockApi();

export const DOMAIN_PATTERN = /^(?!-)(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

export const INITIAL_EMPTY_STATE = {
  active: false,
  enabled: false,
  profiles: [],
  activeProfileIds: [],
  effectiveDomains: [],
  domains: [],
  schedules: [],
  helperInstalled: false,
  sessionSupported: false,
  revision: 0,
  browserIntegrations: [],
};

const HOST_NAME = "com.luis.siteblock";
const RULE_ID_START = 1000;
const LOG_PREFIX = "[SiteBlock Ext]";

function browserApi() {
  return globalThis.browser ?? globalThis.chrome;
}

function blockedPage(domain) {
  return `${browserApi().runtime.getURL("blocked.html")}?domain=${encodeURIComponent(domain)}`;
}

function domainForUrl(value, domains) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return domains.find((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return undefined;
  }
}

async function applyRules(nextState) {
  const api = browserApi();
  console.info(`${LOG_PREFIX} Aplicando novo estado: active=${nextState.active}, revision=${nextState.revision}, domínios=${(nextState.domains ?? []).length}`);
  try {
    const existing = await api.declarativeNetRequest.getDynamicRules();
    const domains = nextState.active ? (nextState.domains ?? []) : [];
    const addRules = domains.map((domain, index) => ({
      id: RULE_ID_START + index,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: [
          "main_frame",
          "sub_frame",
          "xmlhttprequest",
          "script",
          "image",
          "media",
          "font",
          "stylesheet",
          "other",
        ],
      },
    }));
    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map((rule) => rule.id),
      addRules,
    });
    console.info(`${LOG_PREFIX} Regras dinâmicas DNR atualizadas: ${addRules.length} ativas (removidas anteriores: ${existing.length})`);

    await api.storage.local.set({
      revision: nextState.revision ?? 0,
      active: Boolean(nextState.active),
      domains,
    });

    if (!domains.length) return;
    const tabs = await api.tabs.query({});
    let redirectedCount = 0;
    await Promise.all(
      tabs.map((tab) => {
        const domain = domainForUrl(tab.url, domains);
        if (domain && tab.id !== undefined) {
          redirectedCount++;
          return api.tabs.update(tab.id, { url: blockedPage(domain) });
        }
        return undefined;
      }),
    );
    if (redirectedCount > 0) {
      console.info(`${LOG_PREFIX} Redirecionadas ${redirectedCount} abas abertas para a página de bloqueio.`);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Erro ao atualizar regras:`, err);
  }
}

function connect() {
  const api = browserApi();
  let port;
  try {
    console.info(`${LOG_PREFIX} Conectando ao host nativo '${HOST_NAME}'...`);
    port = api.runtime.connectNative(HOST_NAME);
  } catch (err) {
    console.warn(`${LOG_PREFIX} Falha ao conectar ao host nativo:`, err);
    return;
  }
  port.onMessage.addListener((nextState) => {
    console.debug(`${LOG_PREFIX} Mensagem recebida do bridge nativo:`, nextState);
    void applyRules(nextState);
  });
  port.onDisconnect.addListener(() => {
    const error = api.runtime.lastError?.message;
    console.warn(`${LOG_PREFIX} Desconectado do bridge nativo (${error ?? "desconexão normal"}). Tentando reconectar em 2s...`);
    setTimeout(connect, 2_000);
  });
  port.postMessage({ type: "subscribe" });
  console.info(`${LOG_PREFIX} Conexão estabelecida e subscrição enviada.`);
}

void applyRules({ active: false, domains: [] });
connect();


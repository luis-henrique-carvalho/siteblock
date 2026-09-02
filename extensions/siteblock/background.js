const HOST_NAME = "com.luis.siteblock";
const RULE_ID_START = 1000;

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
  await api.storage.local.set({
    revision: nextState.revision ?? 0,
    active: Boolean(nextState.active),
    domains,
  });

  if (!domains.length) return;
  const tabs = await api.tabs.query({});
  await Promise.all(
    tabs.map((tab) => {
      const domain = domainForUrl(tab.url, domains);
      return domain && tab.id !== undefined
        ? api.tabs.update(tab.id, { url: blockedPage(domain) })
        : undefined;
    }),
  );
}

function connect() {
  const api = browserApi();
  let port;
  try {
    port = api.runtime.connectNative(HOST_NAME);
  } catch {
    return;
  }
  port.onMessage.addListener((nextState) => void applyRules(nextState));
  port.onDisconnect.addListener(() => setTimeout(connect, 2_000));
  port.postMessage({ type: "subscribe" });
}

void applyRules({ active: false, domains: [] });
connect();

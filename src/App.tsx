import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type Schedule = { id: string; days: number[]; start: string; end: string };
type BrowserIntegration = {
  name: string;
  detected: boolean;
  policyReady: boolean;
  extensionRegistered: boolean;
  extensionConnected: boolean;
  mode: string;
};
type SiteBlockState = {
  active: boolean;
  enabled: boolean;
  domains: string[];
  schedules: Schedule[];
  helperInstalled: boolean;
  sessionSupported: boolean;
  revision: number;
  browserIntegrations: BrowserIntegration[];
};
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const domainPattern = /^(?!-)(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

function formatSystemError(error: unknown) {
  const detail = String(error);
  if (detail.includes("Request dismissed")) {
    return "Autorização cancelada. Na próxima tentativa, confirme a senha na janela do Ubuntu.";
  }
  return `Erro: ${detail}`;
}

function App() {
  const [state, setState] = useState<SiteBlockState | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [integrationRequired, setIntegrationRequired] = useState(false);
  const stateLabel = state?.active ? "Bloqueando agora" : "Acesso liberado";

  useEffect(() => {
    let mounted = true;
    let initialState: SiteBlockState | null = null;
    void invoke<SiteBlockState>("get_siteblock_status")
      .then((nextState) => {
        initialState = nextState;
        if (nextState.helperInstalled && !nextState.sessionSupported) {
          setIntegrationRequired(true);
          setMessage("A integração do SiteBlock precisa ser atualizada uma vez.");
          return nextState;
        }
        return nextState.helperInstalled
          ? invoke<SiteBlockState>("start_privileged_session")
          : nextState;
      })
      .then((nextState) => {
        if (mounted) setState(nextState);
      })
      .catch((error) => {
        if (!mounted) return;
        setState(
          initialState ?? {
            active: false,
            enabled: false,
            domains: [],
            schedules: [],
            helperInstalled: false,
            sessionSupported: false,
            revision: 0,
            browserIntegrations: [],
          },
        );
        if (initialState?.helperInstalled) {
          setIntegrationRequired(true);
          setMessage("A integração do SiteBlock precisa ser atualizada uma vez.");
        } else {
          setMessage(formatSystemError(error));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function commit(next: SiteBlockState, successMessage: string) {
    setBusy(true);
    setMessage("");
    try {
      setState(
        await invoke<SiteBlockState>("save_siteblock_config", {
          config: { enabled: next.enabled, domains: next.domains, schedules: next.schedules },
        }),
      );
      setMessage(successMessage);
    } catch (error) {
      setMessage(formatSystemError(error));
    } finally {
      setBusy(false);
    }
  }
  async function toggleEnabled() {
    if (state)
      await commit(
        { ...state, enabled: !state.enabled },
        !state.enabled ? "Bloqueio ativado." : "Bloqueio desativado.",
      );
  }
  async function installService() {
    setBusy(true);
    setMessage("");
    try {
      setState(await invoke<SiteBlockState>("install_siteblock_service"));
      setIntegrationRequired(false);
      setMessage(
        "Integração configurada. Reinicie o Chrome ou Brave uma única vez para carregar a extensão; depois, use somente esta interface.",
      );
    } catch (error) {
      setMessage(formatSystemError(error));
    } finally {
      setBusy(false);
    }
  }
  async function addDomain(event: React.FormEvent) {
    event.preventDefault();
    if (!state) return;
    const domain = newDomain
      .trim()
      .toLowerCase()
      .replace(/^www\./, "");
    if (!domainPattern.test(domain))
      return setMessage("Informe um domínio válido, como reddit.com.");
    if (state.domains.includes(domain)) return setMessage("Esse domínio já está na lista.");
    await commit({ ...state, domains: [...state.domains, domain] }, `${domain} adicionado.`);
    setNewDomain("");
  }
  async function removeDomain(domain: string) {
    if (state)
      await commit(
        { ...state, domains: state.domains.filter((item) => item !== domain) },
        `${domain} removido.`,
      );
  }
  function addSchedule() {
    if (state)
      setState({
        ...state,
        schedules: [
          ...state.schedules,
          { id: crypto.randomUUID(), days: [0, 1, 2, 3, 4], start: "09:00", end: "18:00" },
        ],
      });
  }
  function updateSchedule(id: string, patch: Partial<Schedule>) {
    if (state)
      setState({
        ...state,
        schedules: state.schedules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
      });
  }
  function toggleDay(rule: Schedule, day: number) {
    updateSchedule(rule.id, {
      days: rule.days.includes(day)
        ? rule.days.filter((item) => item !== day)
        : [...rule.days, day].sort(),
    });
  }
  const scheduleSummary = useMemo(
    () =>
      !state?.schedules.length
        ? "Sem horários: o bloqueio depende apenas do botão acima."
        : `${state.schedules.length} período${state.schedules.length > 1 ? "s" : ""} configurado${state.schedules.length > 1 ? "s" : ""}.`,
    [state?.schedules.length],
  );
  if (!state) return <main className="loading">Carregando o painel de proteção…</main>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">S/</span>
          <span>SiteBlock</span>
        </div>
        <div className="system-pill">
          <span className={`signal ${state.active ? "on" : ""}`} /> Sistema{" "}
          {state.active ? "em proteção" : "em pausa"}
        </div>
      </header>
      {(!state.helperInstalled || integrationRequired) && (
        <aside className="setup-warning">
          <div>
            <strong>Configure a integração do sistema.</strong>
            <span> Autorize agora para preparar o bloqueio e os navegadores.</span>
          </div>
          <button className="setup-button" onClick={() => void installService()} disabled={busy}>
            Configurar agora
          </button>
        </aside>
      )}
      {state.helperInstalled && (
        <section className="browser-status" aria-label="Integração com navegadores">
          <div>
            <p className="eyebrow">INTEGRAÇÃO CONTÍNUA</p>
            <p className="browser-copy">
              A lista é aplicada automaticamente. Chrome e Brave recebem a política no momento da
              mudança; a extensão elimina também páginas que já estão abertas.
            </p>
          </div>
          <div className="browser-list">
            {state.browserIntegrations.map((browser) => (
              <div className="browser-item" key={browser.name}>
                <span className={`browser-dot ${browser.detected ? "ready" : ""}`} />
                <div>
                  <strong>{browser.name}</strong>
                  <small>
                    {browser.extensionConnected
                      ? "Conectado — regras imediatas"
                      : browser.extensionRegistered
                        ? "Extensão instalada"
                        : browser.policyReady
                          ? browser.mode
                          : "Aguardando integração"}
                  </small>
                </div>
              </div>
            ))}
            {state.browserIntegrations.length === 0 && (
              <span className="browser-empty">Integração será verificada após a configuração.</span>
            )}
          </div>
        </section>
      )}
      <section className="hero">
        <div>
          <p className="eyebrow">CONTROLE DE ACESSO</p>
          <h1>
            Seu foco tem um <em>perímetro.</em>
          </h1>
          <p className="hero-copy">
            Defina os destinos que interrompem seu ritmo e deixe o SiteBlock cuidar do horário.
          </p>
        </div>
        <div className={`shield ${state.active ? "shield-active" : ""}`}>
          <span className="shield-icon">⌁</span>
          <strong>{stateLabel}</strong>
          <small>
            {state.enabled ? scheduleSummary : "Ative o bloqueio para aplicar as regras."}
          </small>
        </div>
      </section>
      <section className="status-card">
        <div>
          <p className="eyebrow">CHAVE MESTRA</p>
          <h2>{state.enabled ? "Proteção habilitada" : "Proteção em pausa"}</h2>
          <p>
            {state.enabled
              ? "As regras e horários abaixo estão valendo."
              : "Nenhum site será bloqueado até você reativar."}
          </p>
        </div>
        <button
          className={`power-button ${state.enabled ? "is-on" : ""}`}
          onClick={() => void toggleEnabled()}
          disabled={busy || !state.helperInstalled}
        >
          <span className="power-dot" />
          {state.enabled ? "Desativar" : "Ativar"}
        </button>
      </section>
      <div className="content-grid">
        <section className="panel domains-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LISTA DE BLOQUEIO</p>
              <h2>{state.domains.length} destinos</h2>
            </div>
            <span className="counter">{state.domains.length.toString().padStart(2, "0")}</span>
          </div>
          <form className="domain-form" onSubmit={(event) => void addDomain(event)}>
            <input
              value={newDomain}
              onChange={(event) => setNewDomain(event.target.value)}
              placeholder="ex.: reddit.com"
              aria-label="Novo domínio"
            />
            <button type="submit" disabled={busy || !state.helperInstalled}>
              Adicionar
            </button>
          </form>
          {message && (
            <p className={message.startsWith("Erro:") ? "inline-message error" : "inline-message"}>
              {message}
            </p>
          )}
          <ul className="domain-list">
            {state.domains.length === 0 && (
              <li className="empty-state">Sua lista ainda está vazia.</li>
            )}
            {state.domains.map((domain, index) => (
              <li key={domain}>
                <span className="domain-index">{String(index + 1).padStart(2, "0")}</span>
                <span>{domain}</span>
                <button
                  aria-label={`Remover ${domain}`}
                  onClick={() => void removeDomain(domain)}
                  disabled={busy || !state.helperInstalled}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel schedule-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">JANELAS DE FOCO</p>
              <h2>Agenda semanal</h2>
            </div>
            <button
              className="text-button"
              onClick={addSchedule}
              disabled={busy || !state.helperInstalled}
            >
              + Novo período
            </button>
          </div>
          <div className="schedule-list">
            {state.schedules.length === 0 && (
              <p className="empty-state">Sem períodos automáticos. A chave mestra controla tudo.</p>
            )}
            {state.schedules.map((rule, index) => (
              <article className="schedule-rule" key={rule.id}>
                <div className="rule-top">
                  <span>PERÍODO {String(index + 1).padStart(2, "0")}</span>
                  <button
                    onClick={() =>
                      setState({
                        ...state,
                        schedules: state.schedules.filter((item) => item.id !== rule.id),
                      })
                    }
                    aria-label="Remover período"
                  >
                    Remover
                  </button>
                </div>
                <div className="days">
                  {weekdays.map((day, dayIndex) => (
                    <button
                      key={day}
                      className={rule.days.includes(dayIndex) ? "selected" : ""}
                      onClick={() => toggleDay(rule, dayIndex)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="times">
                  <label>
                    Início
                    <input
                      type="time"
                      value={rule.start}
                      onChange={(event) => updateSchedule(rule.id, { start: event.target.value })}
                    />
                  </label>
                  <span>→</span>
                  <label>
                    Fim
                    <input
                      type="time"
                      value={rule.end}
                      onChange={(event) => updateSchedule(rule.id, { end: event.target.value })}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
          <button
            className="save-button"
            onClick={() => void commit(state, "Agenda atualizada.")}
            disabled={busy || !state.helperInstalled}
          >
            Salvar agenda
          </button>
        </section>
      </div>
      <footer>
        {message && (
          <p className={message.toLowerCase().includes("erro") ? "message error" : "message"}>
            {message}
          </p>
        )}
        <span>
          Autorização solicitada uma vez por abertura do app, ou ao atualizar a integração.
          Alterações da lista são aplicadas automaticamente.
        </span>
      </footer>
    </main>
  );
}
export default App;

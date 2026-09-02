interface SetupBannerProps {
  onInstall: () => void;
  busy: boolean;
}

export function SetupBanner({ onInstall, busy }: SetupBannerProps) {
  return (
    <aside className="setup-warning" role="alert">
      <div>
        <strong>Configure a integração do sistema.</strong>
        <span> Autorize agora para preparar o bloqueio e os navegadores.</span>
      </div>
      <button className="setup-button" onClick={onInstall} disabled={busy} type="button">
        {busy ? "Configurando…" : "Configurar agora"}
      </button>
    </aside>
  );
}

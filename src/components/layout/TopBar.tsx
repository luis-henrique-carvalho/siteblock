import { SignalDot } from "../common/SignalDot";

interface TopBarProps {
  active: boolean;
}

export function TopBar({ active }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          S/
        </span>
        <span>SiteBlock</span>
      </div>
      <div className="system-pill" role="status" aria-live="polite">
        <SignalDot active={active} />
        <span>Sistema {active ? "em proteção" : "em pausa"}</span>
      </div>
    </header>
  );
}

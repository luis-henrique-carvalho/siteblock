import { ShieldBadge } from "./ShieldBadge";

interface HeroSectionProps {
  active: boolean;
  enabled: boolean;
  scheduleSummary: string;
}

export function HeroSection({ active, enabled, scheduleSummary }: HeroSectionProps) {
  return (
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
      <ShieldBadge active={active} enabled={enabled} scheduleSummary={scheduleSummary} />
    </section>
  );
}

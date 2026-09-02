import { ShieldBadge } from "./ShieldBadge";

interface HeroSectionProps {
  active: boolean;
  enabled: boolean;
  scheduleSummary: string;
}

export function HeroSection({ active, enabled, scheduleSummary }: HeroSectionProps) {
  return (
    <section className="hero my-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-2 max-w-xl">
        <p className="eyebrow text-xs font-mono font-semibold tracking-wider text-primary uppercase">
          CONTROLE DE ACESSO
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Seu foco tem um{" "}
          <em className="italic font-serif text-primary underline decoration-primary/40 underline-offset-4">
            perímetro.
          </em>
        </h1>
        <p className="hero-copy text-sm text-muted-foreground leading-relaxed">
          Defina os destinos que interrompem seu ritmo e deixe o SiteBlock cuidar do horário.
        </p>
      </div>

      <div className="shrink-0">
        <ShieldBadge active={active} enabled={enabled} scheduleSummary={scheduleSummary} />
      </div>
    </section>
  );
}

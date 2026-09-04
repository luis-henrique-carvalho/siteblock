import { Globe, Flame, Compass } from "lucide-react";
import type { ComponentProps } from "react";

interface BrowserIconProps extends ComponentProps<"svg"> {
  name: string;
}

export function BrowserIcon({ name, className = "size-4", ...props }: BrowserIconProps) {
  const normalized = name.toLowerCase();

  if (normalized.includes("chrome")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="21.17" y1="8" x2="12" y2="8" />
        <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
        <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
      </svg>
    );
  }

  if (normalized.includes("brave")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" />
        <path d="M9 10l3-2 3 2v3c0 2-1.5 3.5-3 4-1.5-.5-3-2-3-4v-3z" />
      </svg>
    );
  }

  if (normalized.includes("firefox")) {
    return <Flame className={className} aria-hidden="true" {...props} />;
  }

  if (normalized.includes("safari")) {
    return <Compass className={className} aria-hidden="true" {...props} />;
  }

  return <Globe className={className} aria-hidden="true" {...props} />;
}

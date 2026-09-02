interface SignalDotProps {
  active: boolean;
  className?: string;
}

export function SignalDot({ active, className = "" }: SignalDotProps) {
  return <span className={`signal ${active ? "on" : ""} ${className}`.trim()} aria-hidden="true" />;
}

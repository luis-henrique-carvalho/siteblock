import { Globe } from "lucide-react";
import type { ComponentProps } from "react";

interface BrowserIconProps extends ComponentProps<"svg"> {
  name: string;
}

export function BrowserIcon({ name, className = "size-5", ...props }: BrowserIconProps) {
  const normalized = name.toLowerCase();

  if (normalized.includes("chrome")) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {/* Chrome Logo: outer segments & inner blue circle */}
        <circle cx="24" cy="24" r="20" fill="#EA4335" />
        <path
          d="M24 4C31.5 4 37.9 8.1 41.2 14.3L28.8 24H14.1C15.8 12.8 24 4 24 4Z"
          fill="#EA4335"
        />
        <path
          d="M44 24C44 29.5 41.8 34.5 38.1 38.1L27.5 24.5L34.6 14.3H41.2C43 17.2 44 20.5 44 24Z"
          fill="#FBBC05"
        />
        <path
          d="M24 44C16.5 44 10.1 39.9 6.8 33.7L19.2 24H33.9C32.2 35.2 24 44 24 44Z"
          fill="#34A853"
        />
        <circle cx="24" cy="24" r="10" fill="#FFFFFF" />
        <circle cx="24" cy="24" r="8" fill="#1A73E8" />
      </svg>
    );
  }

  if (normalized.includes("brave")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path
          d="M12 2L4 5V11C4 16.5 7.4 21.6 12 23C16.6 21.6 20 16.5 20 11V5L12 2Z"
          fill="#FB542B"
        />
        <path
          d="M12 6L7 8.5V11.5C7 14.8 9.1 17.9 12 18.8C14.9 17.9 17 14.8 17 11.5V8.5L12 6Z"
          fill="#FFFFFF"
          fillOpacity="0.2"
        />
        <path
          d="M12 8L9 9.8V12C9 13.9 10.3 15.6 12 16.2C13.7 15.6 15 13.9 15 12V9.8L12 8Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (normalized.includes("firefox")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <circle cx="12" cy="12" r="10" fill="#7122FA" />
        <path
          d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM17.8 8.4C17.3 10.6 15.8 12.3 14 13.2C14 11.6 14.8 10.1 15.9 9.1C16.7 8.4 17.3 8.4 17.8 8.4Z"
          fill="#FF5836"
        />
        <circle cx="11.5" cy="12.5" r="5.5" fill="#FF9400" />
        <circle cx="10" cy="13" r="3.5" fill="#FFDF00" />
      </svg>
    );
  }

  return <Globe className={className} aria-hidden="true" />;
}

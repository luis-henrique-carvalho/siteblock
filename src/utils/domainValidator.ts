import { DOMAIN_PATTERN } from "../constants/config";

/**
 * Normalizes user domain input by trimming, converting to lower-case,
 * and stripping protocol and leading www. prefixes.
 */
export function sanitizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0];
}

/**
 * Validates domain format against valid domain name syntax.
 */
export function isValidDomain(domain: string): boolean {
  return DOMAIN_PATTERN.test(domain);
}

export interface DomainValidationResult {
  valid: boolean;
  sanitized: string;
  error?: string;
}

/**
 * Validates domain candidate considering empty input and duplicate checking.
 */
export function validateNewDomain(
  candidate: string,
  existingDomains: string[],
): DomainValidationResult {
  const sanitized = sanitizeDomain(candidate);

  if (!sanitized) {
    return {
      valid: false,
      sanitized: "",
      error: "Informe um domínio válido, como reddit.com.",
    };
  }

  if (!isValidDomain(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: "Informe um domínio válido, como reddit.com.",
    };
  }

  if (existingDomains.includes(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: "Esse domínio já está na lista.",
    };
  }

  return {
    valid: true,
    sanitized,
  };
}

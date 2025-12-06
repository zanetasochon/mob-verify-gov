import { trustedGovDomains } from "./govDomains";
import { URL } from "url";

export function extractHostname(input: string): string | null {
  try {
    const url = input.startsWith("http") ? input : `https://${input}`;
    const { hostname } = new URL(url);
    return hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isTrustedGovDomain(input: string) {
  const hostname = extractHostname(input);

  if (!hostname) {
    return { valid: false, reason: "INVALID_URL", hostname: null };
  }

  const endsWithGovPl = hostname.endsWith(".gov.pl") || hostname === "gov.pl";
  const inRegistry = trustedGovDomains.includes(hostname);

  return {
    valid: true,
    hostname,
    endsWithGovPl,
    inRegistry,
    isTrusted: endsWithGovPl && inRegistry,
  };
}

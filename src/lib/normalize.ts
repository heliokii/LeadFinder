import dns from "node:dns/promises";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * "No website" per the spec means: the field is empty, OR it isn't a
 * plausible URL, OR the domain doesn't resolve. This does a fast DNS
 * lookup rather than an HTTP GET — enough to catch dead/expired domains
 * without hammering every candidate site with a full request.
 */
export async function hasNoWebsite(rawWebsite: string | undefined | null): Promise<boolean> {
  if (!rawWebsite || !rawWebsite.trim()) return true;

  const url = coerceUrl(rawWebsite);
  if (!url) return true; // not a parseable URL at all

  try {
    await dns.lookup(url.hostname);
    return false; // resolves -> treat as having a real website
  } catch {
    return true; // NXDOMAIN or similar -> effectively no website
  }
}

function coerceUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null; // e.g. "facebook" alone
    return url;
  } catch {
    return null;
  }
}

/**
 * Normalizes a phone number to E.164 for de-duplication and DNC matching.
 * `defaultCountry` should be an ISO 3166-1 alpha-2 code (e.g. "PH") since
 * OSM phone tags are frequently written in local format without a country
 * code.
 */
export function normalizePhone(
  raw: string | undefined | null,
  defaultCountry: string
): string | undefined {
  if (!raw) return undefined;
  const parsed = parsePhoneNumberFromString(raw, defaultCountry as CountryCode);
  return parsed?.isValid() ? parsed.number : undefined;
}

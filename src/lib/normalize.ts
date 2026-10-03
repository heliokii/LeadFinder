import dns from "node:dns/promises";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * "No website" per the spec means: the field is empty, OR it isn't a
 * plausible URL, OR the domain doesn't resolve. This does a fast DNS
 * lookup rather than an HTTP GET — enough to catch dead/expired domains
 * without hammering every candidate site with a full request.
 *
 * A timeout wraps the lookup so one slow domain can't stall a whole search
 * (important on serverless where the function times out after ~60s).
 */
export async function hasNoWebsite(rawWebsite: string | undefined | null): Promise<boolean> {
  if (!rawWebsite || !rawWebsite.trim()) return true;

  const url = coerceUrl(rawWebsite);
  if (!url) return true; // not a parseable URL at all

  try {
    await withTimeout(dns.lookup(url.hostname), 4000);
    return false; // resolves -> treat as having a real website
  } catch {
    return true; // NXDOMAIN / timeout / similar -> effectively no website
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("dns timeout")), ms);
    // Don't keep a serverless function alive just for this timer.
    (timer as unknown as { unref?: () => void }).unref?.();
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
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

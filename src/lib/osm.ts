/**
 * Free, open-data replacement for the Google Places API.
 *
 * - Nominatim (nominatim.org) geocodes a free-text area ("Batangas City")
 *   into a lat/lon + bounding box. No API key; usage policy requires a
 *   real User-Agent and ~1 req/sec.
 * - Overpass API (overpass-api.de and mirrors) runs a structured query
 *   against OpenStreetMap's tagged data and returns matching businesses
 *   with whatever contact/website/hours tags mappers have added.
 *
 * Trade-off vs. Google Places: no star ratings or review counts (OSM
 * doesn't have them), and coverage/tag completeness varies by area. See
 * README "Data sources" for backup options if a given area is sparse.
 *
 * Both services are free for reasonable personal use and, being open
 * data, carry no "no scraping the map" restriction the way Google Maps
 * does — we're calling their documented APIs, not scraping rendered HTML.
 */

import { osmRateLimiter } from "./rateLimiter";
import { CATEGORY_CATALOG, type BusinessCategory } from "./categories";

// Maps the curated catalog to OSM tag queries. Some categories share an
// underlying tag because OSM does not distinguish those businesses further.
const CATEGORY_TAGS: Record<BusinessCategory, readonly string[]> = Object.fromEntries(
  CATEGORY_CATALOG.map((category) => [category.value, category.tags])
) as unknown as Record<BusinessCategory, readonly string[]>;

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export interface RawOsmBusiness {
  osmId: string; // "node/123" | "way/456"
  name: string;
  category: BusinessCategory;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  lat?: number;
  lon?: number;
}

function userAgentHeaders() {
  const ua = process.env.OSM_USER_AGENT;
  if (!ua || /you@example\.com|your-email@your-domain\.com/i.test(ua)) {
    // Not fatal, but both services can and will block generic/default
    // User-Agents. Fail loudly in dev so this gets fixed before it
    // causes silent empty results.
    console.warn(
      "[osm] OSM_USER_AGENT is unset or still the placeholder value. " +
        "Set it in .env to your own identifying string before real use."
    );
  }
  return { "User-Agent": ua || "lead-finder-personal/1.0" };
}

export async function geocodeArea(area: string): Promise<GeocodeResult> {
  const endpoint = process.env.NOMINATIM_ENDPOINT ?? "https://nominatim.openstreetmap.org/search";
  const url = `${endpoint}?format=json&limit=1&q=${encodeURIComponent(area)}`;

  const results = await osmRateLimiter.schedule(async () => {
    const res = await fetch(url, { headers: userAgentHeaders() });
    if (!res.ok) throw new Error(`Nominatim geocode failed: ${res.status}`);
    return (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  });

  if (!results.length) {
    throw new Error(`Could not geocode area "${area}". Try a more specific place name.`);
  }

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}

function buildOverpassQuery(lat: number, lon: number, radiusM: number, tags: readonly string[]): string {
  // `out center;` gives us a lat/lon for ways/relations too, not just nodes.
  const clauses = tags
    .map((tag) => {
      const [key, value] = tag.split("=");
      return `node["${key}"="${value}"](around:${radiusM},${lat},${lon});
       way["${key}"="${value}"](around:${radiusM},${lat},${lon});`;
    })
    .join("\n");

  return `[out:json][timeout:25];
(
  ${clauses}
);
out center tags;`;
}

export async function searchBusinesses(params: {
  lat: number;
  lon: number;
  radiusKm: number;
  category: BusinessCategory;
  keywords?: string;
}): Promise<RawOsmBusiness[]> {
  const radiusM = Math.round(params.radiusKm * 1000);
  const tags = CATEGORY_TAGS[params.category];
  const query = buildOverpassQuery(params.lat, params.lon, radiusM, tags);

  const endpoints = overpassEndpoints();
  let lastError = "unknown error";
  let data: { elements: OverpassElement[] } | undefined;

  for (const endpoint of endpoints) {
    try {
      data = await osmRateLimiter.schedule(async () => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...userAgentHeaders(),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(overpassTimeoutMs()),
        });
        if (!res.ok) {
          const detail = (await res.text()).replace(/\s+/g, " ").trim().slice(0, 240);
          const error = new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
          if (isRetryableOverpassStatus(res.status)) {
            throw error;
          }
          throw Object.assign(error, { retryable: false });
        }
        return (await res.json()) as { elements: OverpassElement[] };
      });
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "unknown error";
      if (err && typeof err === "object" && "retryable" in err && err.retryable === false) break;
    }
  }

  if (!data) {
    throw new Error(
      `Overpass is temporarily unavailable after ${endpoints.length} endpoint attempt${endpoints.length === 1 ? "" : "s"} (${lastError}). Try a smaller radius or retry in a moment.`
    );
  }

  const businesses = data.elements
    .map((el) => mapElement(el, params.category))
    .filter((b): b is RawOsmBusiness => b !== null);

  if (!params.keywords) return businesses;

  const kw = params.keywords.toLowerCase();
  return businesses.filter(
    (b) => b.name.toLowerCase().includes(kw) || (b.address ?? "").toLowerCase().includes(kw)
  );
}

function overpassEndpoints(): string[] {
  const configured = (process.env.OVERPASS_ENDPOINTS ?? "")
    .split(",")
    .map((endpoint) => endpoint.trim())
    .filter(Boolean);
  const primary = process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
  const fallbacks = configured.length
    ? configured
    : ["https://overpass.kumi.systems/api/interpreter"];
  return [...new Set([primary, ...fallbacks])];
}

function overpassTimeoutMs(): number {
  const value = Number(process.env.OVERPASS_REQUEST_TIMEOUT_MS ?? 35000);
  return Number.isFinite(value) && value >= 1000 ? value : 35000;
}

function isRetryableOverpassStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Exported for unit testing against tests/mocks/overpass-response.json
// without hitting the real network.
export function mapElement(el: OverpassElement, category: BusinessCategory): RawOsmBusiness | null {
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name) return null; // unnamed businesses aren't useful leads

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:suburb"],
    tags["addr:province"] ?? tags["addr:state"],
  ].filter(Boolean);

  return {
    osmId: `${el.type}/${el.id}`,
    name,
    category,
    address: addressParts.length ? addressParts.join(", ") : undefined,
    phone: tags["contact:phone"] ?? tags.phone,
    website: tags["contact:website"] ?? tags.website,
    openingHours: tags.opening_hours,
    lat,
    lon,
  };
}

export function buildOsmMapsUrl(osmId: string): string {
  const [type, id] = osmId.split("/");
  return `https://www.openstreetmap.org/${type}/${id}`;
}

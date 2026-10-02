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

export type BusinessCategory = "dentist" | "real_estate" | "lawyer" | "law_firm";

// Maps our categories to OSM tag queries. law_firm and lawyer share the
// same underlying tag (OSM doesn't distinguish solo practitioners from
// firms) — see README for how the app tells them apart heuristically.
const CATEGORY_TAGS: Record<BusinessCategory, string[]> = {
  dentist: ["amenity=dentist", "healthcare=dentist"],
  lawyer: ["office=lawyer"],
  law_firm: ["office=lawyer"],
  real_estate: ["office=estate_agent"],
};

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
  if (!ua || ua.includes("you@example.com")) {
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

function buildOverpassQuery(lat: number, lon: number, radiusM: number, tags: string[]): string {
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
  const endpoint = process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
  const radiusM = Math.round(params.radiusKm * 1000);
  const tags = CATEGORY_TAGS[params.category];
  const query = buildOverpassQuery(params.lat, params.lon, radiusM, tags);

  const data = await osmRateLimiter.schedule(async () => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...userAgentHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) {
      throw new Error(`Overpass query failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as { elements: OverpassElement[] };
  });

  const businesses = data.elements
    .map((el) => mapElement(el, params.category))
    .filter((b): b is RawOsmBusiness => b !== null);

  if (!params.keywords) return businesses;

  const kw = params.keywords.toLowerCase();
  return businesses.filter(
    (b) => b.name.toLowerCase().includes(kw) || (b.address ?? "").toLowerCase().includes(kw)
  );
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

import { afterEach, describe, expect, it, vi } from "vitest";
import { searchBusinesses } from "@/lib/osm";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Overpass client", () => {
  it("falls back after a transient upstream failure", async () => {
    vi.stubEnv("OVERPASS_ENDPOINT", "https://primary.example/api/interpreter");
    vi.stubEnv("OVERPASS_ENDPOINTS", "https://fallback.example/api/interpreter");
    vi.stubEnv("OSM_MIN_REQUEST_INTERVAL_MS", "0");

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 504 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [{ type: "node", id: 1, lat: 1, lon: 2, tags: { name: "Test Dentist" } }] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchBusinesses({ lat: 1, lon: 2, radiusKm: 1, category: "dentist" })).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a bounded actionable error after all endpoints fail", async () => {
    vi.stubEnv("OVERPASS_ENDPOINT", "https://primary.example/api/interpreter");
    vi.stubEnv("OVERPASS_ENDPOINTS", "https://fallback.example/api/interpreter");
    vi.stubEnv("OSM_MIN_REQUEST_INTERVAL_MS", "0");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("<html>upstream details</html>", { status: 504 }))));

    await expect(searchBusinesses({ lat: 1, lon: 2, radiusKm: 1, category: "dentist" })).rejects.toThrow(
      "Overpass is temporarily unavailable after 2 endpoint attempts (HTTP 504: <html>upstream details</html>)"
    );
  });
});

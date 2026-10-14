import { useState } from "react";
import { useRouter } from "next/router";
import { SectionLabel, useToast } from "@/components/ui";
import { CATEGORY_CATALOG } from "@/lib/categories";

export default function SearchPage() {
  const router = useRouter();
  useToast();
  const [area, setArea] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [category, setCategory] = useState<string>("dentist");
  const [categoryQuery, setCategoryQuery] = useState<string>(CATEGORY_CATALOG[0].label);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    area: string;
    totalFound: number;
    noWebsiteCount: number;
    skippedHasWebsiteCount: number;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, radiusKm, category, keywords: keywords || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const selectedCategory = CATEGORY_CATALOG.find((item) => item.value === category);
  const categoryMatches = CATEGORY_CATALOG.filter((item) => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return true;
    return [item.value, item.label, ...item.aliases].some((value) => value.toLowerCase().includes(query));
  }).slice(0, 8);

  function chooseCategory(value: string) {
    const item = CATEGORY_CATALOG.find((candidate) => candidate.value === value);
    if (!item) return;
    setCategory(item.value);
    setCategoryQuery(item.label);
    setCategoryOpen(false);
  }

  return (
    <div>
      <SectionLabel n={1} total="04" label="Search — find no-website businesses" />

      <div className="hero-kicker">
        <span>OpenStreetMap · free · no API key</span>
        <span>LF / 01</span>
      </div>
      <h1>
        Find businesses
        <br />
        without a website.
      </h1>
      <p className="lede">
        Name an area, pick a category. We query OpenStreetMap, filter to listings with no
        working website, and save the rest as scored leads.
      </p>

      <div className="card lift" style={{ marginTop: 26 }}>
        <form className="stack" onSubmit={onSubmit}>
          <div>
            <label htmlFor="area">Area</label>
            <input
              id="area"
              placeholder="e.g. Batangas City, Philippines"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="category-picker">
            <label htmlFor="category-search">Category</label>
            <div className="category-combobox">
              <input
                id="category-search"
                role="combobox"
                aria-expanded={categoryOpen}
                aria-controls="category-suggestions"
                aria-autocomplete="list"
                placeholder="Search categories…"
                value={categoryQuery}
                onFocus={() => setCategoryOpen(true)}
                onBlur={() => setTimeout(() => setCategoryOpen(false), 120)}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategoryQuery(value);
                  const exact = CATEGORY_CATALOG.find((item) => item.label.toLowerCase() === value.trim().toLowerCase() || item.value === value.trim().toLowerCase());
                  setCategory(exact?.value ?? "");
                  setCategoryOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && categoryMatches[0]) {
                    e.preventDefault();
                    chooseCategory(categoryMatches[0].value);
                  }
                  if (e.key === "Escape") setCategoryOpen(false);
                }}
                autoComplete="off"
              />
              {categoryOpen && <div className="category-suggestions" id="category-suggestions" role="listbox">
                {categoryMatches.length > 0 ? categoryMatches.map((item) => (
                  <button key={item.value} type="button" role="option" aria-selected={category === item.value} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseCategory(item.value)}>
                    <span>{item.label}</span><small>{item.hint}</small>
                  </button>
                )) : <div className="category-empty">No matching categories</div>}
              </div>}
            </div>
            <p className="category-hint">{selectedCategory?.hint ?? "Choose a category from the suggestions"}</p>
          </div>
          <div className="row">
            <div>
              <label htmlFor="radius">Radius (km)</label>
              <input
                id="radius"
                type="number"
                min={1}
                max={50}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="keywords">Keywords <span style={{ opacity: 0.6 }}>(optional)</span></label>
              <input
                id="keywords"
                placeholder="e.g. family, orthodontist"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <button type="submit" disabled={loading || !area.trim() || !category}>
              {loading && <span className="spin" aria-hidden="true" />}
              {loading ? "Searching OSM…" : "Search"}
              {!loading && <span className="arrow" aria-hidden="true">→</span>}
            </button>
            {loading && (
              <p className="muted" style={{ marginTop: 10 }}>
                Querying Nominatim → Overpass… this can take 10–30s. Please wait.
              </p>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="card result-card" style={{ marginTop: 20 }}>
          <div className="label" style={{ marginBottom: 8 }}>Result</div>
          <p style={{ margin: "0 0 14px", fontSize: "1.05rem" }}>
            Near <strong>{result.area}</strong>: found {result.totalFound} listings,{" "}
            <strong>{result.noWebsiteCount}</strong> with no working website saved as leads (
            {result.skippedHasWebsiteCount} already had a site).
          </p>
          <button className="secondary" onClick={() => router.push("/leads")}>
            View leads <span className="arrow" aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </div>
  );
}


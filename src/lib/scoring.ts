import type { RawOsmBusiness } from "./osm";

export interface ScoreResult {
  score: number; // 0-100
  flags: string[];
}

/**
 * OSM doesn't carry Google-style ratings or review counts, so scoring
 * here uses proxy signals for "this is a real, active, contactable
 * business worth pitching" instead:
 *  - has a phone number (you can actually reach them)
 *  - listing has opening hours (someone maintains this listing / it's a
 *    real operating business, not a stub)
 *  - has a street address (vs. just a pin)
 *  - name doesn't look like a duplicate/placeholder entry
 *
 * This is intentionally simple and transparent — tune the weights in
 * one place as you see which leads actually convert.
 */
export function scoreLead(business: RawOsmBusiness): ScoreResult {
  const flags: string[] = [];
  // Baseline: it exists, it's in-category, it has no website. Kept below 40
  // so a listing carrying none of the three proxy signals below trips the
  // `sparse_listing` threshold (`score < 40`), and so dropping the 30-point
  // phone bonus lands a lead under the 70 "worth calling now" line.
  let score = 35;

  if (business.phone) {
    score += 30;
  } else {
    flags.push("no_phone");
  }

  if (business.openingHours) {
    score += 15;
  } else {
    flags.push("no_hours_listed");
  }

  if (business.address) {
    score += 15;
  } else {
    flags.push("no_address");
  }

  if (business.name.trim().length < 3 || /^(shop|store|business)\s*\d*$/i.test(business.name)) {
    score -= 20;
    flags.push("placeholder_like_name");
  }

  score = Math.max(0, Math.min(100, score));

  if (score < 40) flags.push("sparse_listing");

  return { score, flags };
}

/**
 * Single source of truth for market defaults.
 *
 * The target market is Australia, so OSM phone tags written in local format
 * ("0412 345 678", "(02) 8765 4321") must normalize against +61, and quotes
 * should default to AUD. Both are .env-overridable so adding a second market
 * later is a one-line change rather than a code hunt.
 */

// ISO 3166-1 alpha-2, as libphonenumber-js expects.
export const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY_CODE?.trim() || "AU";

// ISO 4217 code used for the payment message shown on a WON lead.
export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY?.trim() || "AUD";

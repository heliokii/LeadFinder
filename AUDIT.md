# Repository audit

Date: 2026-10-14

Scope: application code, API routes, Prisma schema/bootstrap, client pages,
configuration, tests, and deployment files. Findings below are concrete cases
found in this checkout, not a promise that a network dependency will never fail.

## Fixed

- Lead and draft status endpoints accepted arbitrary jumps (including marking a
  draft `SENT` without approval). Transitions are now checked in
  `src/lib/workflow.ts`.
- Draft generation could move a `NEW`, `WON`, or `CLOSED` lead backward to
  `DRAFTED`. Generation is now limited to `QUALIFIED`/`DRAFTED`, and the detail
  page only offers the action at those stages.
- Draft generation and the draft `SENT` update could leave partial database
  state. Each write plus its related lead update is now one Prisma transaction.
- OSM category queries can return the same OSM element more than once, and DNS
  checks were serialized. Search now de-duplicates by OSM id and checks eight
  websites concurrently, keeping large searches within the API timeout.
- DNC POST accepted non-string values and could create duplicate entries. Input
  types, trimming, normalization, and duplicate checks are now enforced.
- Invalid rate-limit configuration produced `NaN` and disabled the limiter.
  Invalid/negative values now fall back to 1200 ms.
- CSV export could emit spreadsheet formulas from lead data. Formula-leading
  values are now prefixed before CSV escaping.
- Payment requests accepted invalid amounts/currencies; the API and message
  generator now sanitize both.
- Client pages reported success or an empty lead list after failed API calls.
  Search, DNC, lead detail, and the leads list now surface response errors.
- Malformed stored `scoreFlags` JSON could crash the lead detail page; parsing
  now fails safely.
- OSM user-agent placeholder detection missed the value used in `.env.example`.
  Both placeholder forms are now warned about.
- `align-items: end` triggered the Autoprefixer warning; it now uses
  `flex-end` in `src/styles/globals.css`.
- `tsconfig.json` used the deprecated `baseUrl` setup; the alias remains but
  no longer depends on that option.
- The dashboard had no protection when exposed through a deployment. A small
  middleware now applies Basic Auth when `APP_ACCESS_CODE` is set and fails
  closed on Vercel when the secret is missing.

## Known design limits / deferred work

- `src/lib/db.ts` contains a runtime `CREATE TABLE IF NOT EXISTS` bootstrap in
  addition to Prisma migrations. This is intentional for ephemeral Vercel
  `/tmp` SQLite, where a build-time migration cannot persist. Any future schema
  change must update both the Prisma schema/migration and this bootstrap.
- SQLite on Vercel is ephemeral by design. Use Postgres for durable hosted data.
- API integration tests are not present; the test suite covers the pure
  normalization, scoring, draft, payment, export, and workflow logic. A
  throwaway-DB route test suite is the next useful investment if this becomes
  multi-user or publicly deployed.
- The Prisma package in this repository is 5.22.0, so `datasource db { url =
  env("DATABASE_URL") }` is valid and required. The editor warning shown in the
  screenshot is from a newer Prisma language-server schema rule; removing
  `url` would break this installed Prisma version. The workspace pins the
  editor to Prisma 6 compatibility in `.vscode/settings.json`; upgrade Prisma
  deliberately before migrating to `prisma.config.ts`.

## Verification

- `npx tsc --noEmit --pretty false` passes.
- `npm test -- --run` passes 22 tests when run with the required elevated
  process permissions (the sandbox-only run is blocked by a Windows `EPERM`
  realpath error inside `node_modules`).
- `npm run build` passes, including the middleware bundle and all Next pages.
- `npx prisma validate` passes.
- `npm audit` could not be completed because this environment could not resolve
  `registry.npmjs.org`; dependency advisories remain unchecked.

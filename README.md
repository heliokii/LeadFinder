# lead-finder

A personal, single-user tool: find local service businesses with no website
listed on OpenStreetMap, and draft (never auto-send) outreach offering to
build them one. Everything that leaves your machine is something you
manually approved and copy-pasted.

## What changed from the original brief

**No Google Places API.** Google Places has real costs past a small free
tier and a key-management burden for a personal tool. This uses
**OpenStreetMap** instead, via two free, keyless, ToS-compliant APIs:

- **Nominatim** — turns "Batangas City" into a lat/lon.
- **Overpass API** — a structured query language over OSM's tagged data,
  returning businesses with whatever `name`, `phone`, `website`,
  `opening_hours`, and `addr:*` tags mappers have added.

Both are documented, public APIs — this calls them the way they're meant to
be called, not by scraping Google's map tiles or HTML (which the original
brief already correctly ruled out).

**Trade-off to know about:** OSM has no star ratings or review counts, and
tag completeness varies a lot by area — a business might exist on the map
but have no phone or hours filled in. `scoreLead()` in `src/lib/scoring.ts`
scores on proxy signals instead (has a phone, has hours, has an address,
name doesn't look like a placeholder). If a given area comes back thin,
two free-tier alternatives worth adding later:
- **Geoapify Places API** (has a generous free tier, includes some ratings)
- **Foursquare Places API** (free tier, better US/EU coverage than PH in
  practice — worth checking your specific area first)

Both would slot into `src/lib/osm.ts`'s `searchBusinesses` shape.

**Personal-only.** No auth system, no multi-tenant anything — this is meant
to run on `localhost` on your own machine. `APP_ACCESS_CODE` in `.env` is
there only if you ever expose it beyond localhost (e.g. tunneled to check
leads from your phone); it isn't wired to page-level auth by default —
see "Extending" below if you do that.

**Payment.** PayPal, Wise, and Payoneer don't offer a simple public
"generate a payment request" API for a personal/solo account — the real
ones (PayPal Invoicing API, Wise Platform API) need a registered business
integration and approval. So instead of a half-working integration,
`src/lib/payment.ts` composes a plain-text message from whichever
links/handles you put in `.env` (a `paypal.me` handle, your Wise account
details, a Payoneer request link you generated from their dashboard). You
paste that into your own invoice or follow-up email once a lead says yes —
see the "Mark as won client" button on a lead's detail page.

Everything else — human-approval gate before sending, opt-out line on
every draft, do-not-contact list checked before every send, rate limiting,
event log — is kept as specified, because it was already the right design.

## Data model

See `prisma/schema.prisma`. Summary:

- **Lead** — one row per no-website business found, with contact info,
  score, and a status that moves `NEW → QUALIFIED → DRAFTED → APPROVED →
  SENT → REPLIED → WON → CLOSED` (or `DNC` at any point).
- **Draft** — the 3 generated message variants per lead, each with its own
  `DRAFT → APPROVED → SENT → REPLIED → CLOSED` status. Nothing with status
  other than `SENT` was ever transmitted anywhere.
- **DoNotContact** — checked before a search saves a new lead and before a
  draft can be marked `SENT`.
- **Event** — append-only log: every search, every draft generated, every
  status change.
- **SearchQuery** — a record of areas/categories you've already covered.

## Setup

```bash
cp .env.example .env
# edit .env: set OSM_USER_AGENT to something identifying (your name/email)

npm install
npm run prisma:migrate   # creates dev.db and the tables above
npm run dev              # http://localhost:3000
```

No API keys are required for the core flow. The Google Places API key,
if you ever add it as a paid backup source, would go in `.env` too but
nothing in the current code expects one.

## Using it

1. **Search** — type an area ("Lipa City, Batangas"), pick a category and
   radius, run it. New no-website leads get saved; ones that already have
   a working site are skipped and reported in the summary.
2. **Leads** — filter/sort, open one, hit "Generate 3 draft variants."
3. Review each draft. Edit the text yourself if you want (there's
   currently no in-app edit box — copy, edit in your email client, and
   only click "Approve"/"mark SENT" once you've actually sent your edited
   version; the stored draft is your record of what you approved, not
   necessarily character-for-character what went out).
4. **Approve**, then send it yourself via email/DM/SMS in whatever tool
   you already use, then come back and click **"I sent this manually —
   mark SENT."** The app never sends anything on its own.
5. If someone asks not to be contacted, hit **"Mark do-not-contact"** on
   their lead — this files them in the DNC list so future searches skip
   them and no draft for them can ever be marked SENT again.
6. When a lead becomes a paying client, **"Mark as won client"** then
   **"Get payment message"** for a ready-to-paste payment options block.

## Compliance notes (read before sending anything)

- This only surfaces *public business* information already on OpenStreetMap
  (name, business phone, business hours) — not personal data about
  individuals.
- Unsolicited commercial messaging is regulated differently by country and
  by channel (email vs. SMS vs. social DM) — e.g. the Philippines' Data
  Privacy Act, the EU's GDPR/ePrivacy rules, and CAN-SPAM/TCPA in the US.
  A single, clearly-labeled B2B outreach message with an opt-out is
  generally the safest pattern, which is what the templates default to —
  but check the rules for your target country/channel before a real send,
  especially if you ever text/call rather than email.
- Respect each platform's own outreach/spam policies if you send via a
  social platform's DM feature — this tool doesn't automate that DM send,
  by design.

## Testing plan

`npm test` runs Vitest against pure logic with no network calls:

- `tests/normalize.test.ts` — the "no website" filter (empty field,
  unparseable string, non-resolving domain, resolving domain) and phone
  normalization.
- `tests/scoring.test.ts` — scoring stays in 0–100, flags fire correctly
  for missing phone/hours/address and placeholder-like names.
- `tests/draftGenerator.test.ts` — `ULTRA_SHORT` stays ≤300 chars, every
  variant includes the opt-out line, all 3 variants are generated.
- `tests/mocks/overpass-response.json` — a captured-shape Overpass
  response (one no-website listing, one with a site, one unnamed node
  that should be filtered out) for exercising `mapElement()` without
  hitting the real API. Wire it into a test with `vi.stubGlobal("fetch", …)`
  if you extend `osm.ts`.

Not covered by these tests (needs a running dev DB): the API routes
(`src/pages/api/**`) and the DNC-blocks-SEND gate. Worth adding
integration tests against a throwaway SQLite file if this grows past
personal use.

## Extending

- **Editable drafts in-app**: add a textarea to `leads/[id].tsx` and a
  `content` field to the `PATCH /api/drafts/[id]` handler.
- **Email sending via Gmail API/SMTP**: still keep the `APPROVED → SENT`
  transition manual-triggered from the UI, but have that button call a new
  `/api/drafts/[id]/send` route that actually sends, instead of just
  flipping status — the DNC gate in that handler carries over unchanged.
- **Basic auth if exposed beyond localhost**: check `APP_ACCESS_CODE`
  against a header in a small `middleware.ts`.

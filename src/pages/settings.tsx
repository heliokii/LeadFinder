import { SectionLabel } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div>
      <SectionLabel n={4} total="04" label="Settings — .env configuration" />
      <h1>Settings.</h1>
      <p className="lede">
        All configuration lives in your <code>.env</code> file, not in the database — so nothing
        sensitive passes through the browser. Edit <code>.env</code> and restart the dev server to
        change any of this.
      </p>

      <div className="card lift">
        <h2 style={{ marginTop: 0 }}>Data source</h2>
        <p>
          Leads come from OpenStreetMap via the Overpass and Nominatim APIs — free, no API key,
          no Google Maps scraping. Set <code>OSM_USER_AGENT</code> to something identifying (your
          name or email) — both services block generic User-Agents.
        </p>

        <h2>Categories → OSM tags</h2>
        <div className="table-wrap">
        <table>
          <tbody>
            <tr><td>Dentist</td><td className="mono">amenity=dentist</td></tr>
            <tr><td>Real estate</td><td className="mono">office=estate_agent</td></tr>
            <tr><td>Lawyer / law firm</td><td className="mono">office=lawyer</td></tr>
          </tbody>
        </table>
        </div>

        <h2>Payment links (shown when a lead is marked WON)</h2>
        <p className="muted">
          Set <code>PAYPAL_ME_HANDLE</code>, <code>WISE_ACCOUNT_DETAILS</code>, and/or{" "}
          <code>PAYONEER_PAYMENT_LINK</code> in <code>.env</code>. These are just links you already
          have — the app doesn&apos;t call any payment API on your behalf.
        </p>

        <h2>Rate limiting</h2>
        <p className="muted">
          <code>OSM_MIN_REQUEST_INTERVAL_MS</code> (default 1200ms) enforces a minimum gap between
          every outgoing OSM request, in line with Nominatim&apos;s usage policy.
        </p>
      </div>
    </div>
  );
}

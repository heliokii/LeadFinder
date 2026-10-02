import Link from "next/link";
import { useRouter } from "next/router";

const LINKS = [
  { href: "/", label: "Search" },
  { href: "/leads", label: "Leads" },
  { href: "/dnc", label: "Do-not-contact" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = router.pathname;
  return (
    <div className="shell">
      <nav className="nav" aria-label="Primary">
        <Link href="/" className="brand">
          lead-finder<sup>®</sup>
        </Link>
        {LINKS.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      {children}
      <footer className="footer label">
        <span>lead-finder — personal outreach tool</span>
        <span>OSM data · manual send only</span>
      </footer>
    </div>
  );
}

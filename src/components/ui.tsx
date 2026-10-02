import { useEffect } from "react";
import { useRouter } from "next/router";

/** Toast + clipboard helper + scroll-reveal hook shared by pages. */
export function useToast() {
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const fn = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        document.querySelectorAll(".toast").forEach((el) => el.remove());
      }, 2600);
    };
    document.addEventListener("toast", fn);
    return () => document.removeEventListener("toast", fn);
  }, []);
}

export function toast(msg: string) {
  document.querySelectorAll(".toast").forEach((el) => el.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.appendChild(el);
  document.dispatchEvent(new Event("toast"));
}

export async function copyText(text: string, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast(label);
}

/** Adds .in to .reveal elements as they enter the viewport. */
export function useReveal(dep: unknown = null) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}

/** Back link with router fallback. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <a
      href={href}
      className="label"
      style={{ textDecoration: "none", cursor: "pointer" }}
      onClick={(e) => {
        e.preventDefault();
        router.push(href);
      }}
    >
      ← {children}
    </a>
  );
}

/** Mono numbered section header, helioki SectionLabel style. */
export function SectionLabel({ n, total, label }: { n: number; total?: string; label: string }) {
  return (
    <div className="section-label">
      <span>{label}</span>
      <span>
        {String(n).padStart(2, "0")}
        {total ? ` / ${total}` : ""}
      </span>
    </div>
  );
}

/** Lead status pipeline stepper. */
const PIPE = ["NEW", "QUALIFIED", "DRAFTED", "APPROVED", "SENT", "REPLIED", "WON"] as const;

export function Pipeline({ status }: { status: string }) {
  if (status === "DNC" || status === "CLOSED") {
    return (
      <div className="pipeline" aria-label={`Status: ${status}`}>
        <span className={`pipe-step now`}>
          <span className="dot">●</span> {status}
        </span>
      </div>
    );
  }
  const idx = PIPE.indexOf(status as (typeof PIPE)[number]);
  const cur = idx === -1 ? 0 : idx;
  return (
    <div className="pipeline" aria-label={`Pipeline stage: ${status}`}>
      {PIPE.map((s, i) => (
        <span key={s} style={{ display: "flex", alignItems: "center" }}>
          <span className={`pipe-step${i < cur ? " done" : i === cur ? " now" : ""}`}>
            <span className="dot">{i < cur ? "✓" : i + 1}</span> {s}
          </span>
          {i < PIPE.length - 1 && <span className="pipe-link" />}
        </span>
      ))}
    </div>
  );
}

/** Score with animated bar. */
export function Score({ value }: { value: number }) {
  return (
    <span className="score-cell">
      <span className="score-track" aria-hidden="true">
        <span className="score-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
      <span className="mono">{value}</span>
    </span>
  );
}

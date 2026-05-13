/** Whisper-thin data fragments — scattered, not chunky blocks */

const FRAGMENTS: { t: string; l: string; top: string; fs?: string; op?: number }[] = [
  { t: "ingest(lat, lon)", l: "6%", top: "11%", fs: "9px", op: 0.22 },
  { t: "σ 0.14", l: "72%", top: "8%", fs: "8px", op: 0.18 },
  { t: "risk_tensor[..]", l: "14%", top: "22%", fs: "8px", op: 0.16 },
  { t: "mm/hr → flood", l: "58%", top: "14%", fs: "9px", op: 0.2 },
  { t: "ETA 18", l: "88%", top: "26%", fs: "9px", op: 0.17 },
  { t: "dispatch(queue)", l: "3%", top: "38%", fs: "8px", op: 0.14 },
  { t: "0.82 0.91 0.03", l: "41%", top: "31%", fs: "7px", op: 0.15 },
  { t: "SLA ✓", l: "79%", top: "42%", fs: "9px", op: 0.19 },
  { t: "ward_grid", l: "22%", top: "52%", fs: "8px", op: 0.13 },
  { t: "pipe_db.flush", l: "63%", top: "48%", fs: "8px", op: 0.16 },
  { t: "surface_mm", l: "91%", top: "55%", fs: "8px", op: 0.14 },
  { t: "normalize()", l: "8%", top: "61%", fs: "9px", op: 0.17 },
  { t: "storm.cell", l: "47%", top: "67%", fs: "8px", op: 0.15 },
  { t: "jam.len", l: "71%", top: "73%", fs: "8px", op: 0.14 },
  { t: "tick()", l: "18%", top: "78%", fs: "8px", op: 0.12 },
  { t: "live_stream", l: "54%", top: "84%", fs: "9px", op: 0.18 },
  { t: "Σ alerts", l: "85%", top: "79%", fs: "8px", op: 0.15 },
];

const LINES: { l: string; top: string; w: string; rot?: string }[] = [
  { l: "12%", top: "18%", w: "18%", rot: "-0.5deg" },
  { l: "68%", top: "32%", w: "22%", rot: "0.3deg" },
  { l: "5%", top: "46%", w: "14%" },
  { l: "76%", top: "51%", w: "16%", rot: "-0.2deg" },
  { l: "34%", top: "72%", w: "28%" },
  { l: "82%", top: "88%", w: "12%" },
];

const MICRO_SPARK = "M0,12 L20,8 L40,10 L60,4 L80,9";

export function LandingDataEngine() {
  return (
    <div className="landing-data-engine" aria-hidden="true">
      <div className="landing-data-engine__gradient" />

      {LINES.map((line, i) => (
        <div
          key={`ln-${i}`}
          className="landing-data-engine__hairline"
          style={{
            left: line.l,
            top: line.top,
            width: line.w,
            transform: line.rot ? `rotate(${line.rot})` : undefined,
          }}
        />
      ))}

      {FRAGMENTS.map((f, i) => (
        <span
          key={`fr-${i}`}
          className="landing-data-engine__frag"
          style={{
            left: f.l,
            top: f.top,
            fontSize: f.fs ?? "8px",
            opacity: f.op ?? 0.16,
          }}
        >
          {f.t}
        </span>
      ))}

      {/* Tiny scattered sparklines — not one big chart */}
      <svg className="landing-data-engine__spark landing-data-engine__spark--a" viewBox="0 0 80 16" preserveAspectRatio="none">
        <path d={MICRO_SPARK} fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
      <svg className="landing-data-engine__spark landing-data-engine__spark--b" viewBox="0 0 80 16" preserveAspectRatio="none">
        <path d="M0,6 L25,12 L50,3 L80,8" fill="none" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" />
      </svg>
      <svg className="landing-data-engine__spark landing-data-engine__spark--c" viewBox="0 0 80 16" preserveAspectRatio="none">
        <path d="M0,10 L40,4 L80,11" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      </svg>

      {/* Single faint area strip — thin, low contrast */}
      <svg className="landing-data-engine__chart-strip" viewBox="0 0 400 48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="landing-strip-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--landing-sea)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--landing-sea)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,36 L80,28 L160,32 L240,18 L320,24 L400,14 L400,48 L0,48 Z"
          fill="url(#landing-strip-fill)"
        />
        <path
          className="landing-data-engine__chart-line"
          d="M0,36 L80,28 L160,32 L240,18 L320,24 L400,14"
          fill="none"
          stroke="var(--landing-sea)"
          strokeOpacity="0.22"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

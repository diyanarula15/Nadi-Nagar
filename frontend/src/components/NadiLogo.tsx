/** Minimal wordmark: pulse line + city silhouette */
export function NadiLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 32"
      width="120"
      height="32"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20 L8 12 L12 18 L16 10 L20 16 L24 8 L28 14 L32 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="nadi-logo-pulse"
      />
      <g fill="currentColor" opacity="0.92">
        <rect x="38" y="14" width="4" height="12" rx="0.5" />
        <rect x="44" y="10" width="5" height="16" rx="0.5" />
        <rect x="51" y="16" width="4" height="10" rx="0.5" />
        <rect x="57" y="8" width="6" height="18" rx="0.5" />
        <rect x="65" y="12" width="4" height="14" rx="0.5" />
        <rect x="71" y="18" width="5" height="8" rx="0.5" />
        <rect x="78" y="11" width="4" height="15" rx="0.5" />
        <rect x="84" y="15" width="6" height="11" rx="0.5" />
        <rect x="92" y="9" width="5" height="17" rx="0.5" />
        <rect x="99" y="14" width="4" height="12" rx="0.5" />
      </g>
    </svg>
  );
}

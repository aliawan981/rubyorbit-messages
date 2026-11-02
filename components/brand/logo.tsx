export function Logo({
  size = 40,
  withWordmark = true,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="12" fill="#B0123B" />
        <ellipse
          cx="24"
          cy="24"
          rx="15"
          ry="6"
          fill="none"
          stroke="#fff"
          strokeOpacity=".55"
          strokeWidth="2"
          transform="rotate(-25 24 24)"
        />
        <circle cx="24" cy="24" r="7" fill="#fff" />
        <circle cx="36.5" cy="17" r="2.6" fill="#fff" />
      </svg>
      {withWordmark && <span className="text-lg font-semibold tracking-tight">RubyOrbit</span>}
    </span>
  );
}

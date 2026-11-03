import Image from "next/image";

const ASPECT_RATIO = 254 / 166;

export function Logo({
  size = 40,
  withWordmark = true,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt=""
        width={Math.round(size * ASPECT_RATIO)}
        height={size}
        priority
        aria-hidden="true"
      />
      {withWordmark && <span className="text-lg font-semibold tracking-tight">RubyOrbit</span>}
    </span>
  );
}

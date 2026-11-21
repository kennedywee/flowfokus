import { useId } from "react";

/*
 * The background pattern of a record page. One faint pattern per record type:
 * glyph dots for a member, ledger rules for a sale, orbit dots for a program,
 * clock ticks for a session, a barcode for a product. They are drawn from
 * Paper's "Atmosphere" frames. A pattern is decoration only: it is hidden from
 * assistive technology, takes no pointer events, and turns off under
 * `prefers-contrast: more` (styles/parts.css).
 */
export type RecordKind = "member" | "sale" | "program" | "session" | "product";

export function RecordBackdrop({ record }: { record: RecordKind }) {
  const id = useId();
  return (
    <div className="backdrop" data-record={record} aria-hidden="true">
      <svg viewBox="0 0 864 560" width="864" height="560" focusable="false">
        {record === "member" ? <GlyphDots id={id} /> : null}
        {record === "sale" ? <LedgerRules id={id} /> : null}
        {record === "program" ? <OrbitDots /> : null}
        {record === "session" ? <ClockTicks /> : null}
        {record === "product" ? <Barcode id={id} /> : null}
      </svg>
    </div>
  );
}

const SIZE = { width: 864, height: 560 };

/** Dots on a 14px grid that grow and darken toward the right and the bottom of the first rows. */
function GlyphDots({ id }: { id: string }) {
  const dots: { x: number; y: number; r: number; o: number }[] = [];
  for (let row = 0; row < 40; row++) {
    for (let col = 0; col < 62; col++) {
      const x = 7 + col * 14;
      const y = 7 + row * 14;
      // Strongest at the top right, fading out to the left and downward.
      const across = Math.max(0, (x - 28) / (SIZE.width - 28));
      const down = Math.max(0, 1 - y / 460);
      const weight = across * down;
      if (weight < 0.04) continue;
      dots.push({ x, y, r: 0.5 + weight * 1.1, o: 0.12 + weight * 0.5 });
    }
  }
  return (
    <g fill="currentColor" data-id={id}>
      {dots.map((dot) => (
        <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={dot.r.toFixed(2)} fillOpacity={dot.o.toFixed(2)} />
      ))}
    </g>
  );
}

/** Seven horizontal rules, 14px apart, that darken toward the right. */
function LedgerRules({ id }: { id: string }) {
  const gradient = `${id}-ledger`;
  return (
    <>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2={SIZE.width} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.45" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="0.8" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4, 5, 6].map((row) => (
        <path key={row} d={`M0 ${10.5 + row * 14}H${SIZE.width}`} stroke={`url(#${gradient})`} strokeOpacity={[0.99, 0.94, 0.9, 0.85, 0.5, 0.32, 0.15][row]} fill="none" />
      ))}
    </>
  );
}

/** Rings of dots around a point near the top right; each ring is fainter than the one inside it. */
function OrbitDots() {
  const rings = Array.from({ length: 32 }, (_, index) => 28 + index * 20);
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {rings.map((radius, index) => {
        const circumference = 2 * Math.PI * radius;
        const count = Math.round(circumference / 9);
        return (
          <circle
            key={radius}
            cx="690"
            cy="10"
            r={radius}
            strokeOpacity={Math.max(0.03, 0.28 - index * 0.0085).toFixed(3)}
            strokeDasharray={`0.01 ${(circumference / count - 0.01).toFixed(3)}`}
          />
        );
      })}
    </g>
  );
}

/** Dotted circles like the minute ticks of a clock face, around a point near the top right. */
function ClockTicks() {
  const rings = [
    { r: 150, width: 5, opacity: 0.14, dash: "1 14.708" },
    { r: 150, width: 9, opacity: 0.25, dash: "1.25 77.29" },
    { r: 230, width: 5, opacity: 0.11, dash: "1 23.086" },
    { r: 230, width: 9, opacity: 0.2, dash: "1.25 119.178" },
    { r: 310, width: 5, opacity: 0.08, dash: "1 15.232" },
    { r: 310, width: 9, opacity: 0.15, dash: "1.25 79.908" },
    { r: 390, width: 5, opacity: 0.05, dash: "1 19.42" },
    { r: 390, width: 9, opacity: 0.09, dash: "1.25 100.852" },
  ];
  return (
    <g fill="none" stroke="currentColor">
      {rings.map((ring) => (
        <circle key={`${ring.r}-${ring.width}`} cx="700" cy="30" r={ring.r} strokeWidth={ring.width} strokeOpacity={ring.opacity} strokeDasharray={ring.dash} />
      ))}
    </g>
  );
}

/**
 * Bars that hang from the top, thin and thick, taller toward the right and
 * fading downward. Positions repeat a fixed sequence, so the pattern never changes between renders.
 */
function Barcode({ id }: { id: string }) {
  const gradient = `${id}-barcode`;
  const widths = [3, 1, 1, 2, 4, 4, 1, 1, 1, 1, 2, 1, 6, 1, 3, 6];
  const gaps = [4, 5, 2, 4, 2, 5, 6, 4, 3, 3, 4, 5, 4, 3, 6, 3];
  const bars: { x: number; width: number; height: number }[] = [];
  let x = 240;
  for (let index = 0; x < SIZE.width - 12; index++) {
    const width = widths[index % widths.length] ?? 1;
    const progress = (x - 240) / (SIZE.width - 240);
    const height = 200 + progress * 230 + ((index * 37) % 23);
    bars.push({ x, width, height });
    x += width + (gaps[index % gaps.length] ?? 4);
  }
  return (
    <>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2={SIZE.height} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y="0" width={bar.width} height={bar.height.toFixed(0)} fill={`url(#${gradient})`} />
      ))}
    </>
  );
}

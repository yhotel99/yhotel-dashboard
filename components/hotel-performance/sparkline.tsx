"use client";

import { cn } from "@/lib/utils";

/** Lightweight SVG sparkline (no Recharts) for KPI rows. */
export function Sparkline({
  values,
  color,
  className,
}: {
  values: number[];
  color: string;
  className?: string;
}) {
  const w = 140;
  const h = 36;
  if (!values.length) {
    return (
      <div
        className={cn("rounded-md bg-muted/40", className)}
        style={{ width: w, height: h }}
        aria-hidden
      />
    );
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        opacity={0.9}
      />
    </svg>
  );
}

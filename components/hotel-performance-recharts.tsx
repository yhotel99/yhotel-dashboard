"use client";

import { format } from "date-fns";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/functions";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

const CYAN = "#06b6d4";

const chartCfg = {
  op: { label: "Vận hành", color: CYAN },
  cash: { label: "Tiền về", color: "var(--primary)" },
  occ: { label: "Occ %", color: "var(--muted-foreground)" },
} as const;

export type PerformanceChartRow = {
  label: string;
  operating: number;
  cash: number;
  checkout: number;
  occupancyPct: number;
};

type PerformanceRevenueChartProps = {
  chartMerged: PerformanceChartRow[];
  chartSeries: "operating" | "cash" | "checkout";
  lineColor: string;
  overlayOcc: boolean;
  chartMetricMax: number;
};

export function PerformanceRevenueChart({
  chartMerged,
  chartSeries,
  lineColor,
  overlayOcc,
  chartMetricMax,
}: PerformanceRevenueChartProps) {
  const lineKey = chartSeries;

  return (
    <>
      <div className="h-[320px]">
        <ChartContainer
          config={chartCfg}
          className="aspect-auto min-h-0 h-full w-full [&>div]:h-full [&_.recharts-responsive-container]:h-full"
        >
          <ComposedChart
            data={chartMerged}
            margin={{ top: 8, right: overlayOcc ? 48 : 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              domain={[0, (max: number) => (Number.isFinite(max) && max > 0 ? max * 1.08 : 1)]}
              tickFormatter={(v) =>
                v >= 1e6 ? `${(v / 1e6).toFixed(1)}tr` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : `${v}`
              }
            />
            {overlayOcc ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
            ) : null}
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as PerformanceChartRow;
                const val = row[lineKey];
                return (
                  <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg">
                    <p className="font-medium">{row.label}</p>
                    <p className="text-muted-foreground">
                      {lineKey === "operating" && "Đêm ở"}
                      {lineKey === "cash" && "Tiền về"}
                      {lineKey === "checkout" && "Check-out"}:{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(val)}
                      </span>
                    </p>
                    {overlayOcc ? (
                      <p className="text-xs text-muted-foreground">
                        Công suất: {row.occupancyPct.toFixed(1)}%
                      </p>
                    ) : null}
                  </div>
                );
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={lineKey}
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              animationDuration={350}
            />
            {overlayOcc ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="occupancyPct"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                opacity={0.85}
              />
            ) : null}
          </ComposedChart>
        </ChartContainer>
      </div>
      {chartMetricMax === 0 && chartMerged.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {chartSeries === "cash"
            ? "Không có thanh toán (paid) phân bổ trong các ngày của kỳ — kiểm tra bộ lọc hoặc ngày paid_at."
            : chartSeries === "checkout"
              ? "Không có booking check-out rơi vào các ngày trong kỳ (theo ngày check-out)."
              : "Không có doanh thu phân bổ theo đêm trong kỳ."}
        </p>
      ) : null}
    </>
  );
}

type PerformanceDrillLineChartProps = {
  points: { label: string; v: number }[];
};

export function PerformanceDrillLineChart({ points }: PerformanceDrillLineChartProps) {
  return (
    <ChartContainer config={chartCfg} className="h-48 w-full aspect-auto">
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={40} />
        <Line type="monotone" dataKey="v" stroke={CYAN} strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

export function buildDrillTrendPoints(
  drill: string,
  trend: { date: string; operating: number; cash: number; outstandingExposure: number }[],
  dailyMetrics: { occupancyPct: number; adr: number; revpar: number }[]
): { label: string; v: number }[] {
  return trend.map((t, i) => ({
    label: format(new Date(t.date + "T12:00:00"), "dd/MM"),
    v:
      drill === "operating"
        ? t.operating
        : drill === "cash"
          ? t.cash
          : drill === "ar"
            ? t.outstandingExposure
            : drill === "occ"
              ? dailyMetrics[i]?.occupancyPct ?? 0
              : drill === "adr"
                ? dailyMetrics[i]?.adr ?? 0
                : dailyMetrics[i]?.revpar ?? 0,
  }));
}

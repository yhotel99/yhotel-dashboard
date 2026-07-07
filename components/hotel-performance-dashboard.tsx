"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import useSWR from "swr";
import {
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { IconFlame, IconInfoCircle } from "@tabler/icons-react";

import { formatCurrency } from "@/lib/functions";
import { buildDrillTrendPoints } from "@/components/hotel-performance-recharts";
import { DateRangePicker } from "@/components/date-range/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useBranch } from "@/contexts/branch-context";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";

const PerformanceRevenueChart = dynamic(
  () =>
    import("@/components/hotel-performance-recharts").then((m) => ({
      default: m.PerformanceRevenueChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-md bg-muted" />,
  }
);

const PerformanceDrillLineChart = dynamic(
  () =>
    import("@/components/hotel-performance-recharts").then((m) => ({
      default: m.PerformanceDrillLineChart,
    })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-md bg-muted" /> }
);

const CYAN = "#00FFFF";

const MICROCOPY = {
  operating: `Doanh thu vận hành (Stay date): phân bổ theo đêm lưu trú — KPI chính. Không dùng ngày check-in làm mốc ghi nhận.`,
  cash: `Tiền thực thu (Payment date): ghi nhận khi nhận được thanh toán. Khác với doanh thu đã kiếm theo đêm.`,
  ar: `Công nợ (Accounts receivable): tổng số còn phải thu trên booking đang lọc (giá trị − đã thu).`,
  occupancy: `Công suất: đêm phòng bán / đêm phòng khả dụng trong kỳ (ảnh chụp tồn kho phòng hiện tại).`,
  adr: `ADR = Doanh thu vận hành trong kỳ ÷ số đêm phòng bán trong kỳ.`,
  revpar: `RevPAR = Doanh thu vận hành ÷ tổng đêm phòng khả dụng trong kỳ.`,
  checkout: `Chỉ tham khảo: gán toàn bộ giá trị booking vào ngày check-out — không dùng cho KPI vận hành hằng ngày.`,
};

type HotelPerformanceResponse = {
  executive: {
    operatingRevenue: number;
    cashCollected: number;
    accountsReceivable: number;
    occupancyPct: number;
    adr: number;
    revpar: number;
    checkoutReference: number;
    changes: {
      operatingPct: number | null;
      cashPct: number | null;
      arPct: number | null;
      occupancyPct: number | null;
      adrPct: number | null;
      revparPct: number | null;
      checkoutPct: number | null;
    };
  };
  trend: {
    date: string;
    operating: number;
    cash: number;
    checkout: number;
    outstandingExposure: number;
  }[];
  dailyMetrics: {
    date: string;
    occupancyPct: number;
    adr: number;
    revpar: number;
  }[];
  heatmap: {
    date: string;
    occupancyPct: number;
    soldRoomNights: number;
    availableRooms: number;
  }[];
  financial: {
    revenueComposition: {
      roomRevenue: number;
      advanceDeposits: number;
      extraServices: number;
      discounts: number;
      taxes: number;
      taxesNote: string;
    };
    paymentMethods: { method: string; label: string; amount: number }[];
    outstanding: {
      totalUnpaid: number;
      overdueBookings: number;
      agingBuckets: { d0_3: number; d4_7: number; d8plus: number };
    };
  };
  occupancy: {
    soldRoomNights: number;
    availableRoomNights: number;
    roomTypeBreakdown: { type: string; label: string; operating: number }[];
  };
  guests: {
    totalBookings: number;
    cancelledInPeriod: number;
    cancellationRate: number;
    newVsReturning: {
      uniqueNewGuests: number;
      uniqueReturningGuests: number;
      note: string;
    };
    avgLengthOfStay: number;
    noShowRate: number | null;
    noShowNote: string;
  };
  insights: {
    id: string;
    tone: "info" | "warning" | "accent" | "destructive";
    text: string;
  }[];
  tableRows: {
    id: string;
    bookingCode: string;
    room: string;
    guest: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalValue: number;
    paidAmount: number;
    remaining: number;
    status: string;
    statusLabel: string;
    nightlyContribution: { date: string; amount: number }[];
  }[];
  meta: {
    filterOptions: {
      roomTypes: { value: string; label: string }[];
      sources: { value: string; label: string }[];
      statusPresets?: { value: string; label: string }[];
      balanceModes?: { value: string; label: string }[];
      paymentMethods?: { value: string; label: string }[];
      floors?: { value: string; label: string }[];
    };
    branchNote: string;
    unpaidOperatingGap: number;
  };
};

async function fetchHotelPerformance(url: string): Promise<HotelPerformanceResponse> {
  const res = await fetch(url);
  const j = await res.json();
  if (!res.ok || j?.error) {
    throw new Error(typeof j?.error === "string" ? j.error : "Không tải được dữ liệu");
  }
  return j as HotelPerformanceResponse;
}

/** Preset keys for multi-select (no `all` — empty selection = tất cả). */
const STATUS_PRESET_MULTI_FALLBACK: { value: string; label: string }[] = [
  { value: "pipeline", label: "Pipeline (chưa trả phòng)" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "checked_in", label: "Đang ở" },
  { value: "checked_out", label: "Đã trả phòng" },
];

function summarizeStatusPresets(
  selected: string[],
  choices: { value: string; label: string }[]
): string {
  if (selected.length === 0) return "Tất cả trạng thái";
  const map = new Map(choices.map((c) => [c.value, c.label]));
  const labels = selected.map((v) => map.get(v) ?? v);
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]!}, ${labels[1]!}`;
  return `${labels[0]!}, ${labels[1]!} +${labels.length - 2}`;
}

function summarizeFloors(
  selected: number[],
  choices: { value: string; label: string }[]
): string {
  if (selected.length === 0) return "Tất cả tầng";
  const map = new Map(
    choices.map((c) => [Number.parseInt(c.value, 10), c.label] as const)
  );
  const labels = selected.toSorted((a, b) => a - b).map((v) => map.get(v) ?? `Tầng ${v}`);
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]!}, ${labels[1]!}`;
  return `${labels[0]!}, ${labels[1]!} +${labels.length - 2}`;
}

function InfoTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-help rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Giải thích"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconInfoCircle className="size-3.5 shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left text-xs leading-snug">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function HotelPerformanceDashboard() {
  const defaultRange = React.useMemo(() => {
    const now = new Date();
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: endOfDay(now),
    };
  }, []);

  const [range, setRange] = React.useState(defaultRange);
  const [roomType, setRoomType] = React.useState("all");
  const [source, setSource] = React.useState("all");
  /** Empty = không giới hạn theo preset (API = mọi status báo cáo). */
  const [statusPresets, setStatusPresets] = React.useState<string[]>([]);
  const [balance, setBalance] = React.useState<"all" | "unpaid" | "paid">("all");
  const [paymentMethod, setPaymentMethod] = React.useState("all");
  /** Rỗng = mọi tầng. */
  const [selectedFloors, setSelectedFloors] = React.useState<number[]>([]);
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [minNights, setMinNights] = React.useState("");
  const [maxNights, setMaxNights] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [chartSeries, setChartSeries] = React.useState<
    "operating" | "cash" | "checkout"
  >("operating");
  const [overlayOcc, setOverlayOcc] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [drill, setDrill] = React.useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  const { scope, selectedBranchId } = useBranch();
  const branchIdForFetch =
    scope.mode === "single" ? scope.branchId : selectedBranchId;

  const buildQuery = React.useCallback(() => {
    const p = new URLSearchParams({
      fromDate: range.from.toISOString(),
      toDate: range.to.toISOString(),
    });
    if (branchIdForFetch) {
      p.set("branchId", branchIdForFetch);
    }
    if (roomType !== "all") p.set("roomType", roomType);
    if (source !== "all") p.set("source", source);
    if (statusPresets.length > 0) {
      p.set("statusPreset", statusPresets.toSorted().join(","));
    }
    if (balance !== "all") p.set("balance", balance);
    if (paymentMethod !== "all") p.set("paymentMethod", paymentMethod);
    if (selectedFloors.length > 0) {
      p.set("floor", selectedFloors.toSorted((a, b) => a - b).join(","));
    }
    if (minAmount.trim()) p.set("minAmount", minAmount.trim());
    if (maxAmount.trim()) p.set("maxAmount", maxAmount.trim());
    if (minNights.trim()) p.set("minNights", minNights.trim());
    if (maxNights.trim()) p.set("maxNights", maxNights.trim());
    if (searchDebounced) p.set("search", searchDebounced);
    return p;
  }, [
    range,
    roomType,
    source,
    statusPresets,
    balance,
    paymentMethod,
    selectedFloors,
    minAmount,
    maxAmount,
    minNights,
    maxNights,
    searchDebounced,
    branchIdForFetch,
  ]);

  const url = `/api/reports/hotel-performance?${buildQuery().toString()}`;

  const resetDetailFilters = () => {
    setRoomType("all");
    setSource("all");
    setStatusPresets([]);
    setBalance("all");
    setPaymentMethod("all");
    setSelectedFloors([]);
    setMinAmount("");
    setMaxAmount("");
    setMinNights("");
    setMaxNights("");
    setSearchInput("");
    setSearchDebounced("");
  };
  const { data, error, isLoading } = useSWR<HotelPerformanceResponse>(
    url,
    fetchHotelPerformance
  );

  const chartMerged = React.useMemo(() => {
    if (!data) return [];
    return data.trend.map((t, i) => ({
      ...t,
      label: format(new Date(t.date + "T12:00:00"), "dd/MM"),
      occupancyPct: data.dailyMetrics[i]?.occupancyPct ?? 0,
    }));
  }, [data]);

  const chartMetricMax = React.useMemo(() => {
    if (!chartMerged.length) return 0;
    const key = chartSeries;
    return Math.max(
      ...chartMerged.map((row) => {
        const v = row[key as keyof typeof row];
        return typeof v === "number" ? v : 0;
      })
    );
  }, [chartMerged, chartSeries]);

  const lineKey = chartSeries;
  const lineColor =
    lineKey === "operating"
      ? CYAN
      : lineKey === "cash"
        ? "var(--primary)"
        : "var(--muted-foreground)";

  const handleTodayRange = React.useCallback(() => {
    const now = new Date();
    setRange({ from: startOfDay(now), to: endOfDay(now) });
  }, []);

  const handleYesterdayRange = React.useCallback(() => {
    const day = subDays(new Date(), 1);
    setRange({ from: startOfDay(day), to: endOfDay(day) });
  }, []);

  const handleThisWeekRange = React.useCallback(() => {
    const now = new Date();
    setRange({
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    });
  }, []);

  const drillTrendPoints = React.useMemo(
    () =>
      data && drill
        ? buildDrillTrendPoints(drill, data.trend, data.dailyMetrics)
        : [],
    [data, drill]
  );

  const filterOptions = data?.meta.filterOptions;

  const statusPresetChoices = React.useMemo(() => {
    const fromApi = filterOptions?.statusPresets;
    if (fromApi?.length) {
      return fromApi.filter((o) => o.value !== "all");
    }
    return STATUS_PRESET_MULTI_FALLBACK;
  }, [filterOptions?.statusPresets]);

  const toggleStatusPreset = React.useCallback((value: string) => {
    setStatusPresets((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return Array.from(next).toSorted();
    });
  }, []);

  const floorChoices = React.useMemo(
    () => filterOptions?.floors ?? [],
    [filterOptions?.floors]
  );

  const toggleFloor = React.useCallback((floorNum: number) => {
    setSelectedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floorNum)) next.delete(floorNum);
      else next.add(floorNum);
      return Array.from(next).toSorted((a, b) => a - b);
    });
  }, []);

  const isEmpty =
    data &&
    data.executive.operatingRevenue === 0 &&
    data.tableRows.length === 0 &&
    data.executive.cashCollected === 0;

  return (
    <div
      className="flex flex-col gap-8 px-4 py-6 lg:px-8"
      style={{ "--hp-accent": CYAN } as React.CSSProperties}
    >
      {/* 1. Global header */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Hotel Performance Overview
            </h1>
            <Badge variant="outline" className="border-[color:var(--hp-accent)]/40 text-xs font-normal">
              PMS Analytics
            </Badge>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Nguồn dữ liệu thống nhất cho doanh thu thực (đêm ở), tiền về, công nợ và vận hành — luôn đọc kèm chú thích loại chỉ số.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="sm" onClick={handleTodayRange}>
              Hôm nay
            </Button>
            <Button variant="outline" size="sm" onClick={handleYesterdayRange}>
              Hôm qua
            </Button>
            <Button variant="outline" size="sm" onClick={handleThisWeekRange}>
              Tuần này
            </Button>
          </div>
          <DateRangePicker
            initialDateFrom={range.from}
            initialDateTo={range.to}
            onUpdate={(v) => {
              if (v.range.from && v.range.to) setRange({ from: v.range.from, to: v.range.to });
            }}
            showCompare={false}
            locale="vi-VN"
          />
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Bộ lọc phân tích</span>
            <Badge variant="secondary" className="font-normal text-xs">
              Drills + slice dữ liệu
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowAdvancedFilters((v) => !v)}
            >
              {showAdvancedFilters ? "Thu gọn nâng cao" : "Mở rộng nâng cao"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={resetDetailFilters}
            >
              <RotateCcw className="size-3.5" />
              Xóa lọc chi tiết
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chi nhánh
            </span>
            <Select disabled value="single">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Đơn cơ sở" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Toàn hệ thống (đơn cơ sở)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Loại phòng
            </span>
            <Select value={roomType} onValueChange={setRoomType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {(filterOptions?.roomTypes ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nguồn đặt (OTA / Walk-in)
            </span>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {(filterOptions?.sources ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Trạng thái booking
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-normal shadow-xs hover:bg-accent/50"
                  aria-label="Chọn trạng thái booking"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {summarizeStatusPresets(statusPresets, statusPresetChoices)}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(100vw-2rem,320px)] p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Chọn nhiều trạng thái — không chọn = tất cả (theo báo cáo).
                </p>
                <div className="max-h-[min(60vh,280px)] space-y-1 overflow-y-auto pr-1">
                  {statusPresetChoices.map((o) => (
                    <label
                      key={o.value}
                      htmlFor={`hp-status-${o.value}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60"
                    >
                      <Checkbox
                        id={`hp-status-${o.value}`}
                        checked={statusPresets.includes(o.value)}
                        onCheckedChange={() => {
                          toggleStatusPreset(o.value);
                        }}
                      />
                      <span className="text-sm leading-snug">{o.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-end border-t pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusPresets([])}
                  >
                    Bỏ chọn (tất cả)
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Công nợ / thu đủ
            </span>
            <Select
              value={balance}
              onValueChange={(v) => setBalance(v as typeof balance)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(filterOptions?.balanceModes ?? [
                  { value: "all", label: "Mọi trạng thái thu" },
                  { value: "unpaid", label: "Còn nợ" },
                  { value: "paid", label: "Đã thu đủ" },
                ]).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showAdvancedFilters ? (
          <>
            <Separator className="my-1" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tìm theo tên khách
                </span>
                <Input
                  placeholder="Gõ tên, chờ 0,4s để lọc..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  PTTT trong kỳ
                </span>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {(filterOptions?.paymentMethods ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Chỉ booking có ít nhất một giao dịch paid đúng PTTT trong kỳ.
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tầng
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-normal shadow-xs hover:bg-accent/50"
                      aria-label="Chọn tầng"
                      disabled={floorChoices.length === 0}
                    >
                      <span className="min-w-0 flex-1 truncate text-left">
                        {floorChoices.length === 0
                          ? "Chưa có dữ liệu tầng"
                          : summarizeFloors(selectedFloors, floorChoices)}
                      </span>
                      <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[min(100vw-2rem,280px)] p-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Chọn một hoặc nhiều tầng — booking có phòng trên tầng đó sẽ được tính.
                    </p>
                    <div className="max-h-[min(60vh,240px)] space-y-1 overflow-y-auto pr-1">
                      {floorChoices.map((o) => {
                        const n = Number.parseInt(o.value, 10);
                        return (
                          <label
                            key={o.value}
                            htmlFor={`hp-floor-${o.value}`}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60"
                          >
                            <Checkbox
                              id={`hp-floor-${o.value}`}
                              checked={selectedFloors.includes(n)}
                              onCheckedChange={() => {
                                toggleFloor(n);
                              }}
                            />
                            <span className="text-sm leading-snug">{o.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-end border-t pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setSelectedFloors([])}
                        disabled={floorChoices.length === 0}
                      >
                        Bỏ chọn (tất cả tầng)
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Giá trị booking (tối thiểu)
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="VD: 1000000"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Giá trị booking (tối đa)
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="VD: 5000000"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Số đêm (tối thiểu)
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="1"
                  value={minNights}
                  onChange={(e) => setMinNights(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Số đêm (tối đa)
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="30"
                  value={maxNights}
                  onChange={(e) => setMaxNights(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </>
        ) : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {data?.meta.branchNote} Lọc <strong>PTTT</strong> và{" "}
          <strong>công nợ</strong> áp sau khi đã tính tiền đã thu trên booking;{" "}
          <strong>trạng thái booking</strong> áp ở truy vấn DB.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle>Lỗi tải dữ liệu</CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[380px] w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : null}

      {!isLoading && data && isEmpty ? (
        <Card className="rounded-2xl border-dashed">
          <CardHeader className="text-center">
            <CardTitle>Không có dữ liệu trong kỳ</CardTitle>
            <CardDescription>
              Mở rộng khoảng thời gian hoặc đặt lại bộ lọc để xem booking và chỉ số.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!isLoading && data && !isEmpty ? (
        <>
          {/* 2. Executive KPI row */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Chỉ số điều hành
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {[
                {
                  key: "operating",
                  title: "Doanh thu vận hành",
                  sub: "Stay date · KPI chính",
                  value: data.executive.operatingRevenue,
                  tip: MICROCOPY.operating,
                  highlight: true,
                },
                {
                  key: "cash",
                  title: "Tiền thu",
                  sub: "Payment date",
                  value: data.executive.cashCollected,
                  tip: MICROCOPY.cash,
                  highlight: false,
                },
                {
                  key: "ar",
                  title: "Công nợ (AR)",
                  sub: "Chưa thu đủ",
                  value: data.executive.accountsReceivable,
                  tip: MICROCOPY.ar,
                  highlight: false,
                },
                {
                  key: "occ",
                  title: "Công suất",
                  sub: "Đêm bán / đêm khả dụng",
                  value: data.executive.occupancyPct,
                  tip: MICROCOPY.occupancy,
                  highlight: false,
                  format: "pct" as const,
                },
                {
                  key: "adr",
                  title: "ADR",
                  sub: "Giá trung bình / đêm",
                  value: data.executive.adr,
                  tip: MICROCOPY.adr,
                  highlight: false,
                },
                {
                  key: "revpar",
                  title: "RevPAR",
                  sub: "Trên mỗi đêm khả dụng",
                  value: data.executive.revpar,
                  tip: MICROCOPY.revpar,
                  highlight: false,
                },
              ].map((kpi) => (
                <button
                  key={kpi.key}
                  type="button"
                  onClick={() => setDrill(kpi.key)}
                  className={cn(
                    "group relative flex w-full cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[color:var(--hp-accent)]/50",
                    kpi.highlight &&
                      "border-[color:var(--hp-accent)] bg-linear-to-br from-cyan-500/[0.07] to-card ring-1 ring-[color:var(--hp-accent)]/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {kpi.highlight ? (
                          <IconFlame className="size-4 text-[color:var(--hp-accent)]" aria-hidden />
                        ) : null}
                        <span className={cn("text-sm font-semibold", kpi.highlight && "text-[color:var(--hp-accent)]")}>
                          {kpi.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                    </div>
                    <InfoTip content={kpi.tip} />
                  </div>
                  <div className="text-2xl font-bold tabular-nums tracking-tight">
                    {kpi.format === "pct"
                      ? `${kpi.value.toFixed(1)}%`
                      : formatCurrency(kpi.value)}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Checkout reference (tham khảo):{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(data.executive.checkoutReference)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-help underline decoration-dotted">Chi tiết</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs">{MICROCOPY.checkout}</TooltipContent>
              </Tooltip>
            </p>
          </section>

          {/* 3. Revenue chart */}
          <Card className="overflow-hidden rounded-2xl shadow-md">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg">Doanh thu & hiệu suất</CardTitle>
                <CardDescription>
                  Mặc định: đêm ở (stay date). Có thể phủ thêm đường công suất (trục phải).
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ToggleGroup
                  type="single"
                  value={chartSeries}
                  onValueChange={(v) => v && setChartSeries(v as typeof chartSeries)}
                  variant="outline"
                  size="sm"
                  className="grid w-full grid-cols-3 sm:w-auto"
                >
                  <ToggleGroupItem value="operating">Đêm ở</ToggleGroupItem>
                  <ToggleGroupItem value="cash">Thanh toán</ToggleGroupItem>
                  <ToggleGroupItem value="checkout">Check-out</ToggleGroupItem>
                </ToggleGroup>
                <div className="flex items-center gap-2">
                  <Switch id="occ-overlay" checked={overlayOcc} onCheckedChange={setOverlayOcc} />
                  <Label htmlFor="occ-overlay" className="cursor-pointer text-xs">
                    Phủ công suất
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-2 pb-4 sm:px-4">
              <PerformanceRevenueChart
                chartMerged={chartMerged}
                chartSeries={chartSeries}
                lineColor={lineColor}
                overlayOcc={overlayOcc}
                chartMetricMax={chartMetricMax}
              />
            </CardContent>
          </Card>

          {/* 4. Occupancy heatmap + room type */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Heatmap công suất</CardTitle>
                <CardDescription>Độ đậm theo % công suất từng ngày trong kỳ.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {data.heatmap.map((h) => (
                    <Tooltip key={h.date}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex size-10 items-center justify-center rounded-md text-[10px] font-medium text-foreground/90"
                          style={{
                            background: `color-mix(in oklch, var(--primary) ${Math.min(h.occupancyPct, 100)}%, var(--muted))`,
                          }}
                        >
                          {format(new Date(h.date + "T12:00:00"), "d")}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        {format(new Date(h.date + "T12:00:00"), "dd/MM/yyyy")}:{" "}
                        {h.occupancyPct.toFixed(0)}% · {h.soldRoomNights}/{h.availableRooms} đêm
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Theo loại phòng (đêm ở)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.occupancy.roomTypeBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có dữ liệu.</p>
                ) : (
                  data.occupancy.roomTypeBreakdown.map((r) => (
                    <div key={r.type} className="flex items-center justify-between gap-2 text-sm">
                      <span>{r.label}</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(r.operating)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* 5. Financial */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Cơ cấu doanh thu (tiền về trong kỳ)</CardTitle>
                <CardDescription>Phân loại theo payment_type — không gộp check-in.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Tiền phòng" value={data.financial.revenueComposition.roomRevenue} />
                <Row label="Cọc / trả trước" value={data.financial.revenueComposition.advanceDeposits} />
                <Row label="Dịch vụ thêm" value={data.financial.revenueComposition.extraServices} />
                <Row label="Giảm giá (booking)" value={data.financial.revenueComposition.discounts} accent="down" />
                <Row label="Thuế (placeholder)" value={data.financial.revenueComposition.taxes} />
                <p className="pt-2 text-[11px] text-muted-foreground">{data.financial.revenueComposition.taxesNote}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Phương thức thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.financial.paymentMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có giao dịch trong kỳ.</p>
                ) : (
                  data.financial.paymentMethods.map((p) => (
                    <div key={p.method} className="flex justify-between text-sm">
                      <span>{p.label}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Công nợ & aging</CardTitle>
                <CardDescription>Tổng chưa thu · booking quá hạn · phân khúc tuổi nợ (ước lượng).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Tổng chưa thu</span>
                  <span className="text-amber-700 dark:text-amber-400">
                    {formatCurrency(data.financial.outstanding.totalUnpaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Booking quá hạn (sau CO)</span>
                  <span>{data.financial.outstanding.overdueBookings}</span>
                </div>
                <Separator />
                <Row label="0–3 ngày" value={data.financial.outstanding.agingBuckets.d0_3} />
                <Row label="4–7 ngày" value={data.financial.outstanding.agingBuckets.d4_7} />
                <Row label="&gt;7 ngày" value={data.financial.outstanding.agingBuckets.d8plus} />
              </CardContent>
            </Card>
          </div>

          {/* 6. Guest insights */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Booking & khách</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Booking trong tập kỳ" value={String(data.guests.totalBookings)} />
              <Metric label="Đã hủy (trong kỳ)" value={String(data.guests.cancelledInPeriod)} hint={`${data.guests.cancellationRate.toFixed(1)}% / (hủy + active)`} />
              <Metric label="Khách (ước lượng)" value={`${data.guests.newVsReturning.uniqueNewGuests} mới / ${data.guests.newVsReturning.uniqueReturningGuests} quay lại`} hint={data.guests.newVsReturning.note} />
              <Metric label="LOS trung bình" value={`${data.guests.avgLengthOfStay.toFixed(1)} đêm`} />
              <div className="sm:col-span-2 lg:col-span-4 text-xs text-muted-foreground">
                No-show: {data.guests.noShowRate ?? "—"} · {data.guests.noShowNote}
              </div>
            </CardContent>
          </Card>

          {/* 8. Alerts */}
          <Card className="rounded-2xl border-[color:var(--hp-accent)]/25 bg-linear-to-br from-cyan-500/[0.04] to-card shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Cảnh báo & insight</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.insights.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có cảnh báo đặc biệt.</p>
              ) : (
                data.insights.map((i) => (
                  <div
                    key={i.id}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm leading-relaxed",
                      i.tone === "destructive" && "border-destructive/30 bg-destructive/5",
                      i.tone === "warning" && "border-amber-500/30 bg-amber-500/5",
                      i.tone === "accent" && "border-cyan-500/30 bg-cyan-500/5",
                      i.tone === "info" && "bg-muted/40"
                    )}
                  >
                    {i.text}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 7. Table */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Chi tiết booking</CardTitle>
              <CardDescription>Mở rộng để xem đóng góp doanh thu theo đêm.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Mã</TableHead>
                    <TableHead>Khách</TableHead>
                    <TableHead>Phòng</TableHead>
                    <TableHead>CI / CO</TableHead>
                    <TableHead className="text-right">Đêm</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                    <TableHead className="text-right">Đã thu</TableHead>
                    <TableHead className="text-right">Còn lại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tableRows.map((row) => (
                    <React.Fragment key={row.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() =>
                          setExpanded((prev) => {
                            const n = new Set(prev);
                            if (n.has(row.id)) n.delete(row.id);
                            else n.add(row.id);
                            return n;
                          })
                        }
                      >
                        <TableCell>
                          <ChevronDown className={cn("size-4 transition", expanded.has(row.id) && "rotate-180")} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.bookingCode}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{row.guest}</TableCell>
                        <TableCell className="max-w-[130px] truncate">{row.room}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {row.checkIn} → {row.checkOut}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.nights}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(row.totalValue)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(row.paidAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(row.remaining)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {row.statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expanded.has(row.id) ? (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={10}>
                            <div className="flex flex-wrap gap-2 py-2 pl-8">
                              {row.nightlyContribution.length ? (
                                row.nightlyContribution.map((n) => (
                                  <Badge key={n.date} variant="secondary" className="font-normal">
                                    {format(new Date(n.date + "T12:00:00"), "dd/MM")}: {formatCurrency(n.amount)}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">Không có đêm trong kỳ.</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Sheet open={drill !== null} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {drill && data ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {drill === "operating" && "Doanh thu vận hành"}
                  {drill === "cash" && "Tiền thu"}
                  {drill === "ar" && "Công nợ"}
                  {drill === "occ" && "Công suất"}
                  {drill === "adr" && "ADR"}
                  {drill === "revpar" && "RevPAR"}
                </SheetTitle>
                <SheetDescription className="text-left">
                  {drill === "operating" && MICROCOPY.operating}
                  {drill === "cash" && MICROCOPY.cash}
                  {drill === "ar" && MICROCOPY.ar}
                  {drill === "occ" && MICROCOPY.occupancy}
                  {drill === "adr" && MICROCOPY.adr}
                  {drill === "revpar" && MICROCOPY.revpar}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">Giá trị trong kỳ</p>
                  <p className="text-2xl font-bold">
                    {drill === "occ"
                      ? `${data.executive.occupancyPct.toFixed(1)}%`
                      : formatCurrency(
                          drill === "operating"
                            ? data.executive.operatingRevenue
                            : drill === "cash"
                              ? data.executive.cashCollected
                              : drill === "ar"
                                ? data.executive.accountsReceivable
                                : drill === "adr"
                                  ? data.executive.adr
                                  : data.executive.revpar
                        )}
                  </p>
                </div>
                <PerformanceDrillLineChart points={drillTrendPoints} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "down";
}) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span
        className={cn(
          "tabular-nums font-medium",
          accent === "down" && "text-rose-600 dark:text-rose-400"
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

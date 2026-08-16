"use client";

import * as React from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useBranch } from "@/contexts/branch-context";
import { DateRangePicker } from "@/components/date-range/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BOOKING_STATUS, bookingStatusLabels } from "@/lib/constants";
import { formatCurrency } from "@/lib/functions";
import { cn } from "@/lib/utils";
import type {
  ReconcilePairRow,
  ReconcileStatus,
  ReconcileSummary,
} from "@/lib/reports/invoice-reconcile";

type DateField =
  | "created_at"
  | "check_in"
  | "check_out"
  | "actual_check_out";

const DATE_FIELD_LABELS: Record<DateField, string> = {
  created_at: "Theo ngày tạo",
  check_in: "Theo ngày check-in",
  check_out: "Theo ngày check-out",
  actual_check_out: "Theo ngày check-out thực tế",
};

const toDateParam = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type ResultFilter = "all" | "diff" | "excel_only" | "dashboard_only";

type ApiResponse = {
  summary: ReconcileSummary;
  rows: ReconcilePairRow[];
  meta?: { fileName?: string; sheetName?: string };
  error?: string;
};

const RESULT_FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "diff", label: "Chỉ lệch" },
  { value: "excel_only", label: "Chỉ Excel" },
  { value: "dashboard_only", label: "Chỉ Dash" },
];

function statusBadge(status: ReconcileStatus) {
  switch (status) {
    case "matched":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600 border-0">
          Khớp
        </Badge>
      );
    case "matched_room":
      return (
        <Badge className="bg-teal-600 hover:bg-teal-600 border-0">
          Khớp (phòng)
        </Badge>
      );
    case "amount_diff":
      return (
        <Badge className="bg-amber-500 hover:bg-amber-500 text-black border-0">
          Lệch tiền
        </Badge>
      );
    case "excel_only":
      return (
        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-0 dark:bg-sky-950 dark:text-sky-200">
          Chỉ Excel
        </Badge>
      );
    case "dashboard_only":
      return <Badge variant="destructive">Chỉ Dashboard</Badge>;
  }
}

function rowClass(status: ReconcileStatus): string {
  switch (status) {
    case "matched":
    case "matched_room":
      return "bg-emerald-50/70 dark:bg-emerald-950/20";
    case "amount_diff":
      return "bg-amber-50/80 dark:bg-amber-950/25";
    case "excel_only":
      return "bg-sky-50/80 dark:bg-sky-950/25";
    case "dashboard_only":
      return "bg-red-50/80 dark:bg-red-950/25";
  }
}

function StatPill({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-3 py-2.5 sm:px-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", valueClassName)}>
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

export function InvoiceReconcileTool() {
  const { scope, selectedBranchId, activeBranches, canSelectBranch } = useBranch();
  const branchIdForFetch =
    scope.mode === "single" ? scope.branchId : selectedBranchId;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [dateField, setDateField] =
    React.useState<DateField>("actual_check_out");
  const [dateFrom, setDateFrom] = React.useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = React.useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [status, setStatus] = React.useState<string>(BOOKING_STATUS.CHECKED_OUT);
  const [search, setSearch] = React.useState("");
  const [creatorId, setCreatorId] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<ApiResponse | null>(null);
  const [resultFilter, setResultFilter] = React.useState<ResultFilter>("diff");
  const [nameQuery, setNameQuery] = React.useState("");
  const [localBranchId, setLocalBranchId] = React.useState<string>("");

  React.useEffect(() => {
    if (branchIdForFetch) setLocalBranchId(branchIdForFetch);
  }, [branchIdForFetch]);

  const effectiveBranchId = canSelectBranch
    ? localBranchId || branchIdForFetch || ""
    : branchIdForFetch || "";

  const filteredRows = React.useMemo(() => {
    const rows = result?.rows ?? [];
    const q = nameQuery.trim().toUpperCase();
    return rows.filter((r) => {
      if (resultFilter === "diff") {
        if (r.status === "matched" || r.status === "matched_room") return false;
      } else if (resultFilter === "excel_only") {
        if (r.status !== "excel_only") return false;
      } else if (resultFilter === "dashboard_only") {
        if (r.status !== "dashboard_only") return false;
      }
      if (!q) return true;
      const hay = [
        r.excel?.label,
        r.excel?.name,
        r.dashboard?.fullName,
        r.dashboard?.bookingCode,
        r.excel?.phong,
        ...(r.dashboard?.roomNumbers ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
      return hay.includes(q);
    });
  }, [result, resultFilter, nameQuery]);

  function pickFile(next: File | null) {
    if (!next) {
      setFile(null);
      setResult(null);
      return;
    }
    const lower = next.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      toast.error("Chỉ hỗ trợ file .xlsx / .xls");
      return;
    }
    setFile(next);
    setResult(null);
  }

  async function onReconcile() {
    if (!file) {
      toast.error("Chọn file Excel trước");
      return;
    }
    if (!dateFrom || !dateTo) {
      toast.error("Chọn khoảng ngày");
      return;
    }
    setPending(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("dateField", dateField);
      fd.set("dateFrom", dateFrom);
      fd.set("dateTo", dateTo);
      if (effectiveBranchId) fd.set("branchId", effectiveBranchId);
      if (status) fd.set("status", status);
      if (search.trim()) fd.set("search", search.trim());
      if (creatorId.trim()) fd.set("creatorId", creatorId.trim());

      const res = await fetch("/api/reports/invoice-reconcile", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok) {
        throw new Error(json.error || "Đối soát thất bại");
      }
      setResult(json);
      toast.success(
        `Xong: ${json.summary.excelStayCount} stay Excel · ${json.summary.dashboardBookingCount} booking`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đối soát thất bại");
    } finally {
      setPending(false);
    }
  }

  const countDelta = result
    ? result.summary.dashboardBookingCount - result.summary.excelStayCount
    : 0;

  return (
    <div className="flex w-full flex-col gap-4 md:gap-5">
      {/* Filters + upload */}
      <section className="rounded-xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Bộ lọc booking</h2>
            <p className="text-xs text-muted-foreground">
              Cùng filter trang Bookings · file Excel không lưu server
            </p>
          </div>
          <Button
            onClick={onReconcile}
            disabled={pending || !file}
            className="gap-2"
            size="sm"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Đối soát
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {canSelectBranch ? (
              <div className="min-w-0 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Chi nhánh</Label>
                <Select
                  value={localBranchId || "__all__"}
                  onValueChange={(v) =>
                    setLocalBranchId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Chi nhánh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tất cả chi nhánh</SelectItem>
                    {activeBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Loại ngày</Label>
              <Select
                value={dateField}
                onValueChange={(v) => setDateField(v as DateField)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DATE_FIELD_LABELS) as DateField[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {DATE_FIELD_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Khoảng ngày</Label>
              <div className="w-full max-w-[280px]">
                <DateRangePicker
                  key={`${dateFrom}-${dateTo}`}
                  initialDateFrom={dateFrom || undefined}
                  initialDateTo={dateTo || dateFrom || undefined}
                  showCompare={false}
                  locale="vi-VN"
                  align="start"
                  fullWidth
                  onUpdate={(values) => {
                    const from = values.range.from;
                    const to = values.range.to;
                    if (!from || !to) return;
                    setDateFrom(toDateParam(from));
                    setDateTo(toDateParam(to));
                  }}
                />
              </div>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={status || "__any__"}
                onValueChange={(v) => setStatus(v === "__any__" ? "" : v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Tất cả status</SelectItem>
                  {Object.values(BOOKING_STATUS).map((s) => (
                    <SelectItem key={s} value={s}>
                      {bookingStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Tìm kiếm booking
              </Label>
              <div className="relative w-full">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 w-full pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tên / mã booking…"
                />
              </div>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Creator ID</Label>
              <Input
                className="h-9 w-full"
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                placeholder="UUID (tuỳ chọn)"
              />
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs text-muted-foreground">File Excel</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex w-full flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pickFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={cn(
                  "flex min-h-10 w-full max-w-xl items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-left transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50",
                  file && "border-solid bg-background"
                )}
              >
                <FileSpreadsheet
                  className={cn(
                    "size-5 shrink-0",
                    file ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {file ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(file.size / 1024)} KB · bấm để đổi
                    </p>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Kéo thả hoặc chọn .xlsx
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bảng kê HĐ — không lưu server
                    </p>
                  </div>
                )}
              </button>
              {file ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1 text-muted-foreground"
                  onClick={() => {
                    pickFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="size-3.5" />
                  Bỏ
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {result?.summary ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatPill
              label="Excel stay"
              value={result.summary.excelStayCount}
              hint={formatCurrency(result.summary.excelTongTt)}
            />
            <StatPill
              label="Dashboard"
              value={result.summary.dashboardBookingCount}
              hint={formatCurrency(result.summary.dashboardAmount)}
            />
            <StatPill
              label="Lệch số"
              value={`${countDelta >= 0 ? "+" : ""}${countDelta}`}
              hint={`Khớp ${result.summary.matched + result.summary.matchedRoom} · Lệch tiền ${result.summary.amountDiff}`}
            />
            <StatPill
              label="Lệch tiền"
              value={formatCurrency(result.summary.deltaAmount)}
              valueClassName={
                result.summary.deltaAmount === 0
                  ? undefined
                  : result.summary.deltaAmount > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-red-700 dark:text-red-400"
              }
              hint={`Chỉ Excel ${result.summary.excelOnly} · Chỉ Dash ${result.summary.dashboardOnly}`}
            />
          </div>

          {/* Full-width details */}
          <section className="w-full min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Chi tiết đối soát</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {result.meta?.fileName
                    ? result.meta.fileName
                    : "Kết quả"}{" "}
                  · {filteredRows.length} dòng
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border bg-muted/40 p-0.5">
                  {RESULT_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setResultFilter(f.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        resultFilter === f.value
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative min-w-[180px] flex-1 sm:flex-none sm:w-56">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8"
                    placeholder="Lọc tên / phòng…"
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1100px] w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-10 w-[120px] bg-card">
                      Trạng thái
                    </TableHead>
                    <TableHead className="min-w-[260px]">Excel</TableHead>
                    <TableHead className="w-[130px] text-right">Tổng TT</TableHead>
                    <TableHead className="min-w-[260px]">Dashboard</TableHead>
                    <TableHead className="w-[130px] text-right">Amount</TableHead>
                    <TableHead className="w-[120px] text-right">Δ</TableHead>
                    <TableHead className="w-[110px]">Lý do</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-muted-foreground"
                      >
                        Không có dòng nào với bộ lọc hiện tại
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r, i) => (
                      <TableRow key={i} className={rowClass(r.status)}>
                        <TableCell
                          className={cn(
                            "sticky left-0 z-10 whitespace-nowrap",
                            rowClass(r.status)
                          )}
                        >
                          {statusBadge(r.status)}
                        </TableCell>
                        <TableCell className="align-top">
                          {r.excel ? (
                            <div className="space-y-0.5">
                              <div className="font-medium leading-snug">
                                {r.excel.label || (
                                  <span className="font-normal italic text-muted-foreground">
                                    Không có tên
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {r.excel.ngayDen || "?"} →{" "}
                                {r.excel.ngayDi || "?"}
                                {r.excel.phong
                                  ? ` · P.${r.excel.phong}`
                                  : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                HĐ×{r.excel.nHd}: {r.excel.soHds.join(", ")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right tabular-nums whitespace-nowrap">
                          {r.excel ? formatCurrency(r.excel.tongTt) : "—"}
                        </TableCell>
                        <TableCell className="align-top">
                          {r.dashboard ? (
                            <div className="space-y-0.5">
                              <div className="font-medium leading-snug">
                                {r.dashboard.fullName || "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {r.dashboard.checkIn || "?"} →{" "}
                                {r.dashboard.actualCheckOut ||
                                  r.dashboard.checkOut ||
                                  "?"}
                                {r.dashboard.roomNumbers.length
                                  ? ` · P.${r.dashboard.roomNumbers.join(" ")}`
                                  : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {r.dashboard.bookingCode ||
                                  r.dashboard.id.slice(0, 8)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right tabular-nums whitespace-nowrap">
                          {r.dashboard
                            ? formatCurrency(r.dashboard.amount)
                            : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "align-top text-right tabular-nums whitespace-nowrap font-medium",
                            Math.abs(r.delta) < 2
                              ? ""
                              : r.delta > 0
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-red-700 dark:text-red-400"
                          )}
                        >
                          {formatCurrency(r.delta)}
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                          {r.matchReason === "name"
                            ? "name+date"
                            : r.matchReason === "room_dates"
                              ? "room+dates"
                              : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Separator />
            <div className="px-4 py-2 text-xs text-muted-foreground">
              Màu: xanh khớp · vàng lệch tiền · xanh dương chỉ Excel · đỏ chỉ
              Dashboard
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

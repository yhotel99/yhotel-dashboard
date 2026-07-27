"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/functions";
import type {
  ReceptionistRevenueReport,
  UserBookingsKpiRow,
} from "@/app/api/reports/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconCash, IconMaximize, IconReceipt, IconUsers } from "@tabler/icons-react";

type ReceptionistRevenueReportProps = {
  fromDate: Date;
  toDate: Date;
  branchId: string | null;
};

type CombinedReceptionistRow = {
  userId: string | null;
  fullName: string | null;
  email: string | null;
  roomRevenueCollected: number;
  collectedGross: number;
  refundedAmount: number;
  paymentCount: number;
  bookingCount: number;
  totalBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  checkedOutBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  processingRate: number;
};

function userKey(userId: string | null): string {
  return userId ?? "__unknown__";
}

function buildReportUrl(
  path: string,
  fromDate: Date,
  toDate: Date,
  branchId: string | null
): string {
  const fromISO = encodeURIComponent(fromDate.toISOString());
  const toISO = encodeURIComponent(toDate.toISOString());
  const branchQ = branchId
    ? `&branchId=${encodeURIComponent(branchId)}`
    : "";
  return `${path}?fromDate=${fromISO}&toDate=${toISO}${branchQ}`;
}

async function reportFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Không thể tải dữ liệu báo cáo");
  }
  return json;
}

function mergeReceptionistRows(
  revenue: ReceptionistRevenueReport | undefined,
  kpi: UserBookingsKpiRow[] | undefined
): CombinedReceptionistRow[] {
  const map = new Map<string, CombinedReceptionistRow>();

  for (const row of revenue?.rows ?? []) {
    const key = userKey(row.userId);
    map.set(key, {
      userId: row.userId,
      fullName: row.fullName,
      email: row.email,
      roomRevenueCollected: row.roomRevenueCollected,
      collectedGross: row.collectedGross ?? 0,
      refundedAmount: row.refundedAmount ?? 0,
      paymentCount: row.paymentCount ?? 0,
      bookingCount: row.bookingCount ?? row.checkedOutBookings ?? 0,
      totalBookings: 0,
      confirmedBookings: 0,
      checkedInBookings: 0,
      checkedOutBookings: 0,
      pendingBookings: 0,
      cancelledBookings: 0,
      processingRate: 0,
    });
  }

  for (const row of kpi ?? []) {
    const key = userKey(row.userId);
    const existing = map.get(key);
    if (existing) {
      existing.fullName = existing.fullName ?? row.fullName;
      existing.email = existing.email ?? row.email;
      existing.totalBookings = row.totalBookings;
      existing.confirmedBookings = row.confirmedBookings;
      existing.checkedInBookings = row.checkedInBookings;
      existing.checkedOutBookings = row.checkedOutBookings;
      existing.pendingBookings = row.pendingBookings;
      existing.cancelledBookings = row.cancelledBookings;
      existing.processingRate = row.processingRate;
      continue;
    }

    map.set(key, {
      userId: row.userId,
      fullName: row.fullName,
      email: row.email,
      roomRevenueCollected: 0,
      collectedGross: 0,
      refundedAmount: 0,
      paymentCount: 0,
      bookingCount: 0,
      totalBookings: row.totalBookings,
      confirmedBookings: row.confirmedBookings,
      checkedInBookings: row.checkedInBookings,
      checkedOutBookings: row.checkedOutBookings,
      pendingBookings: row.pendingBookings,
      cancelledBookings: row.cancelledBookings,
      processingRate: row.processingRate,
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => b.roomRevenueCollected - a.roomRevenueCollected
  );
}

type ReceptionistTotals = {
  roomRevenueCollected: number;
  collectedGross: number;
  refundedAmount: number;
  paymentCount: number;
  bookingCount: number;
  totalBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  checkedOutBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
};

function ReceptionistReportTable({
  rows,
  totals,
  variant,
}: {
  rows: CombinedReceptionistRow[];
  totals: ReceptionistTotals;
  variant: "compact" | "full";
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nhân viên</TableHead>
          {variant === "full" ? <TableHead>Email</TableHead> : null}
          <TableHead className="text-right">Tiền về túi</TableHead>
          {variant === "full" ? (
            <>
              <TableHead className="text-right">Đã thu</TableHead>
              <TableHead className="text-right">Hoàn tiền</TableHead>
              <TableHead className="text-right">Số GD thu</TableHead>
            </>
          ) : null}
          <TableHead className="text-right">Tổng booking</TableHead>
          {variant === "full" ? (
            <>
              <TableHead className="text-right">Đã xác nhận</TableHead>
              <TableHead className="text-right">Check-in</TableHead>
            </>
          ) : null}
          <TableHead className="text-right">Check-out</TableHead>
          {variant === "full" ? (
            <>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Đã hủy</TableHead>
            </>
          ) : null}
          <TableHead className="text-right">Tỷ lệ xử lý</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.userId ?? `unknown-${index}`}>
            <TableCell className="font-medium">
              {row.fullName || "Không xác định"}
              {!row.userId ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  (dữ liệu cũ / không gắn user)
                </span>
              ) : null}
            </TableCell>
            {variant === "full" ? (
              <TableCell className="text-muted-foreground">
                {row.email || "-"}
              </TableCell>
            ) : null}
            <TableCell className="text-right font-bold text-emerald-600">
              {formatCurrency(row.roomRevenueCollected)}
            </TableCell>
            {variant === "full" ? (
              <>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(row.collectedGross)}
                </TableCell>
                <TableCell className="text-right font-semibold text-red-600">
                  {formatCurrency(row.refundedAmount)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {row.paymentCount}
                </TableCell>
              </>
            ) : null}
            <TableCell className="text-right font-semibold text-primary">
              {row.totalBookings}
            </TableCell>
            {variant === "full" ? (
              <>
                <TableCell className="text-right font-semibold">
                  {row.confirmedBookings}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {row.checkedInBookings}
                </TableCell>
              </>
            ) : null}
            <TableCell className="text-right font-semibold">
              {row.checkedOutBookings}
            </TableCell>
            {variant === "full" ? (
              <>
                <TableCell className="text-right font-semibold">
                  {row.pendingBookings}
                </TableCell>
                <TableCell className="text-right font-semibold text-red-600">
                  {row.cancelledBookings}
                </TableCell>
              </>
            ) : null}
            <TableCell className="text-right font-bold text-emerald-600">
              {row.processingRate.toFixed(2)}%
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/40 font-semibold">
          <TableCell className="font-bold">Tổng</TableCell>
          {variant === "full" ? (
            <TableCell className="text-muted-foreground">-</TableCell>
          ) : null}
          <TableCell className="text-right font-bold text-emerald-600">
            {formatCurrency(totals.roomRevenueCollected)}
          </TableCell>
          {variant === "full" ? (
            <>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.collectedGross)}
              </TableCell>
              <TableCell className="text-right font-bold text-red-600">
                {formatCurrency(totals.refundedAmount)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {totals.paymentCount}
              </TableCell>
            </>
          ) : null}
          <TableCell className="text-right font-bold text-primary">
            {totals.totalBookings}
          </TableCell>
          {variant === "full" ? (
            <>
              <TableCell className="text-right font-bold">
                {totals.confirmedBookings}
              </TableCell>
              <TableCell className="text-right font-bold">
                {totals.checkedInBookings}
              </TableCell>
            </>
          ) : null}
          <TableCell className="text-right font-bold">
            {totals.checkedOutBookings}
          </TableCell>
          {variant === "full" ? (
            <>
              <TableCell className="text-right font-bold">
                {totals.pendingBookings}
              </TableCell>
              <TableCell className="text-right font-bold text-red-600">
                {totals.cancelledBookings}
              </TableCell>
            </>
          ) : null}
          <TableCell className="text-right font-bold text-emerald-600">
            100.00%
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function ReceptionistRevenueReport({
  fromDate,
  toDate,
  branchId,
}: ReceptionistRevenueReportProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const revenueUrl = buildReportUrl(
    "/api/reports/receptionist-revenue",
    fromDate,
    toDate,
    branchId
  );
  const kpiUrl = buildReportUrl("/api/reports/users", fromDate, toDate, branchId);

  const { data, isLoading, error } = useSWR<ReceptionistRevenueReport>(
    revenueUrl,
    reportFetcher
  );
  const {
    data: kpiData,
    isLoading: isLoadingKpi,
    error: kpiError,
  } = useSWR<UserBookingsKpiRow[]>(kpiUrl, reportFetcher);

  const combinedRows = useMemo(
    () => mergeReceptionistRows(data, kpiData),
    [data, kpiData]
  );

  const totals = useMemo(
    () =>
      combinedRows.reduce(
        (acc, row) => {
          acc.roomRevenueCollected += row.roomRevenueCollected;
          acc.collectedGross += row.collectedGross;
          acc.refundedAmount += row.refundedAmount;
          acc.paymentCount += row.paymentCount;
          acc.bookingCount += row.bookingCount;
          acc.totalBookings += row.totalBookings;
          acc.confirmedBookings += row.confirmedBookings;
          acc.checkedInBookings += row.checkedInBookings;
          acc.checkedOutBookings += row.checkedOutBookings;
          acc.pendingBookings += row.pendingBookings;
          acc.cancelledBookings += row.cancelledBookings;
          return acc;
        },
        {
          roomRevenueCollected: 0,
          collectedGross: 0,
          refundedAmount: 0,
          paymentCount: 0,
          bookingCount: 0,
          totalBookings: 0,
          confirmedBookings: 0,
          checkedInBookings: 0,
          checkedOutBookings: 0,
          pendingBookings: 0,
          cancelledBookings: 0,
        }
      ),
    [combinedRows]
  );

  if (isLoading || isLoadingKpi) {
    return (
      <Card className="border-emerald-500/20 bg-linear-to-br from-emerald-500/5 via-card to-card">
        <CardContent className="py-10 text-center text-muted-foreground">
          Đang tải báo cáo lễ tân...
        </CardContent>
      </Card>
    );
  }

  if (error || kpiError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-10 text-center text-destructive">
          Không thể tải báo cáo lễ tân.
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasRows = combinedRows.some(
    (row) =>
      row.paymentCount > 0 ||
      row.refundedAmount > 0 ||
      row.totalBookings > 0
  );

  return (
    <Card className="border-emerald-500/20 bg-linear-to-br from-emerald-500/5 via-card to-card">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Báo cáo lễ tân</CardTitle>
            <CardDescription className="text-base mt-1">
              Tiền về túi (chuẩn chính): đã thu theo ngày thanh toán (paid_at),
              trừ hoàn tiền trong kỳ. Bấm &quot;Xem chi tiết&quot; để xem đầy đủ
              các cột booking.
            </CardDescription>
          </div>
          {hasRows ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 border-emerald-500/30"
              onClick={() => setDetailOpen(true)}
            >
              <IconMaximize className="h-4 w-4" />
              Xem chi tiết
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-500/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tổng tiền về túi (Net)
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {formatCurrency(data.totalRoomRevenueCollected ?? 0)}
                </p>
              </div>
              <div className="rounded-full bg-emerald-500/10 p-2">
                <IconCash className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Đã thu (Gross)
                </p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {formatCurrency(data.totalCollectedGross ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hoàn −{formatCurrency(data.totalRefundedAmount ?? 0)}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <IconReceipt className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Số giao dịch thu
                </p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {data.totalPaymentCount ?? 0}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <IconUsers className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {hasRows ? (
          <>
            <div className="rounded-md border border-emerald-500/20 overflow-x-auto">
              <ReceptionistReportTable
                rows={combinedRows}
                totals={totals}
                variant="compact"
              />
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
              <DialogContent className="flex max-h-[92vh] w-[min(99vw,1800px)]! max-w-none! flex-col gap-4 overflow-hidden p-0 sm:max-w-none!">
                <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
                  <DialogTitle>Chi tiết báo cáo lễ tân</DialogTitle>
                  <DialogDescription>
                    Kỳ {format(fromDate, "dd/MM/yyyy")} –{" "}
                    {format(toDate, "dd/MM/yyyy")}. Tiền về túi theo paid_at;
                    booking KPI theo ngày tạo đơn.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
                  <div className="overflow-x-auto rounded-md border border-emerald-500/20">
                    <ReceptionistReportTable
                      rows={combinedRows}
                      totals={totals}
                      variant="full"
                    />
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Không có dữ liệu trong khoảng thời gian đã chọn.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

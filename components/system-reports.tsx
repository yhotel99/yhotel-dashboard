"use client";

import { useState } from "react";

import {
  IconTrendingDown,
  IconChartBar,
  IconBed,
  IconReceipt,
} from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DateRangePicker } from "@/components/date-range/date-range-picker";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { formatCurrency } from "@/lib/functions";
import { paymentMethodLabels } from "@/lib/constants";

import { Download } from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { endOfDay, startOfMonth, format } from "date-fns";
import Link from "next/link";
import { PaymentStatusBadge } from "@/components/payments/status";
import type { PaymentWithBooking } from "@/lib/types";
import Papa from "papaparse";

const chartConfig = {
  revenue: {
    label: "Doanh thu",
    color: "hsl(var(--primary))",
  },
  bookings: {
    label: "Đặt phòng",
    color: "hsl(var(--primary) / 0.6)",
  },
  standard: {
    label: "Standard",
    color: "hsl(var(--primary))",
  },
  deluxe: {
    label: "Deluxe",
    color: "hsl(217, 91%, 60%)",
  },
  superior: {
    label: "Superior",
    color: "hsl(142, 76%, 36%)",
  },
  family: {
    label: "Family",
    color: "hsl(47, 96%, 53%)",
  },
};

// Colors for pie chart - Room Types
const ROOM_TYPE_COLORS = [
  "hsl(var(--primary))",
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(47, 96%, 53%)",
];

// Colors for pie chart - Customer Sources
const CUSTOMER_SOURCE_COLORS = [
  "hsl(217, 91%, 60%)", // Blue for Booking.com
  "hsl(142, 76%, 36%)", // Green for Agoda
  "hsl(47, 96%, 53%)", // Orange for Vãng lai
  "hsl(0, 0%, 60%)", // Grey for Website
];

// Colors for pie chart - Countries (more colors for many countries)
const COUNTRY_COLORS = [
  "hsl(var(--primary))",
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(47, 96%, 53%)",
  "hsl(330, 81%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(187, 92%, 45%)",
  "hsl(25, 95%, 53%)",
];

// Colors for pie chart - Payment Methods
const PAYMENT_METHOD_COLORS = [
  "hsl(142, 76%, 36%)", // Green for pay_at_hotel
  "hsl(217, 91%, 60%)", // Blue for bank_transfer
  "hsl(0, 0%, 60%)", // Grey for unknown
];

// Types for API responses
type SummaryResponse = {
  revenueByCheckIn: number;
  bookingsByCheckIn: number;
  occupancyPctFromRoomNights: number;
  roomUsage: number;
  roomTurnoverRate: number;
  earlyCheckOutCount: number;
  resoldRoomCount: number;
  refundCashflowByUpdatedAt: number;
};

type MonthlyResponse = {
  month: string;
  revenue: number;
  bookings: number;
}[];

type RoomStatsResponse = {
  type: string;
  label: string;
  count: number;
}[];

type CustomerSourceResponse = {
  source: string;
  label: string;
  count: number;
}[];

type CountryStatsResponse = {
  country: string;
  label: string;
  count: number;
}[];

type PaymentMethodStatsResponse = {
  method: string;
  label: string;
  count: number;
}[];

type RoomStatusResponse = {
  status: string;
  label: string;
  count: number;
  color: string;
}[];

type DailyOccupancyResponse = {
  date: string;
  occupancy: number;
}[];

type UserKpiRow = {
  userId: string | null;
  fullName: string | null;
  email: string | null;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  checkedOutBookings: number;
  processingRate: number;
  pendingRate: number;
}[];

type PaymentsResponse = {
  data: PaymentWithBooking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export function SystemReports() {
  /** Mặc định: ngày 1 tháng này → hết ngày hôm nay (không kéo tới cuối tháng). */
  const getMonthToDateRange = () => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfDay(now),
    };
  };

  const [dateRange, setDateRange] = useState(getMonthToDateRange());
  const [reportType, setReportType] = useState("revenue");
  const [monthRange, setMonthRange] = useState("6_months");
  // Build URLs for SWR
  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();

  const summaryUrl = `/api/reports/summary?fromDate=${encodeURIComponent(
    fromISO
  )}&toDate=${encodeURIComponent(toISO)}`;
  const monthlyUrl = `/api/reports/monthly?months=${monthRange === "6_months" ? "6" : "12"
    }`;
  const roomStatsUrl = "/api/reports/room-stats";
  const customerSourcesUrl = "/api/reports/customer-sources";
  const countryStatsUrl = "/api/reports/country-stats";
  const paymentMethodsUrl = `/api/reports/payment-methods?fromDate=${encodeURIComponent(
    fromISO
  )}&toDate=${encodeURIComponent(toISO)}`;
  const usersKpiUrl = `/api/reports/users?fromDate=${encodeURIComponent(
    fromISO
  )}&toDate=${encodeURIComponent(toISO)}`;

  // Use SWR for all data fetching
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
  } = useSWR<SummaryResponse>(summaryUrl, fetcher);
  const {
    data: monthlyData,
    isLoading: isLoadingMonthly,
    error: monthlyError,
  } = useSWR<MonthlyResponse>(monthlyUrl, fetcher);
  const {
    data: roomStatsData,
    isLoading: isLoadingRoomStats,
    error: roomStatsError,
  } = useSWR<RoomStatsResponse>(roomStatsUrl, fetcher);
  const {
    data: customerSourcesData,
    isLoading: isLoadingCustomerSources,
    error: customerSourcesError,
  } = useSWR<CustomerSourceResponse>(customerSourcesUrl, fetcher);
  const {
    data: countryStatsData,
    isLoading: isLoadingCountryStats,
    error: countryStatsError,
  } = useSWR<CountryStatsResponse>(countryStatsUrl, fetcher);
  const {
    data: paymentMethodsData,
    isLoading: isLoadingPaymentMethods,
    error: paymentMethodsError,
  } = useSWR<PaymentMethodStatsResponse>(paymentMethodsUrl, fetcher);
  const {
    data: roomStatusData,
    isLoading: isLoadingRoomStatus,
    error: roomStatusError,
  } = useSWR<RoomStatusResponse>("/api/reports/room-status", fetcher);
  const {
    data: dailyOccupancyData,
    isLoading: isLoadingDailyOccupancy,
    error: dailyOccupancyError,
  } = useSWR<DailyOccupancyResponse>(
    `/api/reports/daily?fromDate=${encodeURIComponent(
      fromISO
    )}&toDate=${encodeURIComponent(toISO)}`,
    fetcher
  );
  const {
    data: usersKpiData,
    isLoading: isLoadingUsersKpi,
  } = useSWR<UserKpiRow>(usersKpiUrl, fetcher);
  const { data: recentPaymentsData, isLoading: isLoadingRecentPayments } =
    useSWR<PaymentsResponse>("/api/payments?page=1&limit=10", fetcher);

  // Derived state with safe defaults - ensure arrays are always arrays
  const summaryStats = {
    revenueByCheckIn: summaryData?.revenueByCheckIn ?? 0,
    bookingsByCheckIn: summaryData?.bookingsByCheckIn ?? 0,
    occupancyPctFromRoomNights:
      summaryData?.occupancyPctFromRoomNights ?? 0,
    roomUsage: summaryData?.roomUsage ?? 0,
    roomTurnoverRate: summaryData?.roomTurnoverRate ?? 0,
    earlyCheckOutCount: summaryData?.earlyCheckOutCount ?? 0,
    resoldRoomCount: summaryData?.resoldRoomCount ?? 0,
    refundCashflowByUpdatedAt:
      summaryData?.refundCashflowByUpdatedAt ?? 0,
  };
  const revenueData =
    Array.isArray(monthlyData) && !monthlyError ? monthlyData : [];
  const roomStats =
    Array.isArray(roomStatsData) && !roomStatsError ? roomStatsData : [];
  const customerSources =
    Array.isArray(customerSourcesData) && !customerSourcesError
      ? customerSourcesData
      : [];
  const countryStats =
    Array.isArray(countryStatsData) && !countryStatsError ? countryStatsData : [];
  const countryStatsForChart = (() => {
    if (countryStats.length <= 6) return countryStats;

    const sorted = [...countryStats].sort((a, b) => b.count - a.count);
    const topCountries = sorted.slice(0, 5);
    const otherCount = sorted
      .slice(5)
      .reduce((sum, stat) => sum + stat.count, 0);

    return otherCount > 0
      ? [
        ...topCountries,
        { country: "other", label: "Khác", count: otherCount },
      ]
      : topCountries;
  })();
  const paymentMethods =
    Array.isArray(paymentMethodsData) && !paymentMethodsError
      ? paymentMethodsData
      : [];
  const roomStatuses =
    Array.isArray(roomStatusData) && !roomStatusError ? roomStatusData : [];
  const dailyOccupancy =
    Array.isArray(dailyOccupancyData) && !dailyOccupancyError
      ? dailyOccupancyData
      : [];

  // Calculate total rooms for percentage
  const totalRooms = roomStatuses.reduce(
    (sum, status) => sum + status.count,
    0
  );
  const isLoadingReports = isLoadingSummary || isLoadingMonthly;

  // Export report to CSV using PapaParse
  const exportReport = () => {
    const sections: string[] = [];
    const papaConfig = {
      delimiter: ",",
      header: false,
      skipEmptyLines: false,
    };

    // Header section
    sections.push(
      Papa.unparse(
        [
          ["BÁO CÁO HỆ THỐNG"],
          [`Thời gian: ${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`],
          [`Ngày xuất: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`],
          [""],
        ],
        papaConfig
      )
    );

    // Summary Statistics
    const summaryData = [
      ["Chỉ số", "Giá trị"],
      [
        "Tổng thu (theo ngày check-in)",
        formatCurrency(summaryStats.revenueByCheckIn),
      ],
      [
        "Số đặt phòng (theo ngày check-in)",
        summaryStats.bookingsByCheckIn.toString(),
      ],
      [
        "Night Occupancy (đêm phòng trong kỳ)",
        `${summaryStats.occupancyPctFromRoomNights.toFixed(2)}%`,
      ],
      ["Room Usage", summaryStats.roomUsage.toString()],
      ["Room Turnover", summaryStats.roomTurnoverRate.toFixed(2)],
      ["Check-out sớm", summaryStats.earlyCheckOutCount.toString()],
      ["Phòng bán lại trong ngày", summaryStats.resoldRoomCount.toString()],
      [
        "Hoàn tiền (theo ngày cập nhật trạng thái hoàn)",
        formatCurrency(summaryStats.refundCashflowByUpdatedAt),
      ],
    ];
    sections.push(
      Papa.unparse([["=== TỔNG QUAN ==="], ...summaryData, [""]], papaConfig)
    );

    // Monthly Revenue
    if (revenueData.length > 0) {
      const monthlyData = [
        ["Tháng", "Doanh thu", "Số đặt phòng"],
        ...revenueData.map((item) => [
          item.month,
          formatCurrency(item.revenue),
          item.bookings.toString(),
        ]),
      ];
      sections.push(
        Papa.unparse([["=== DOANH THU THEO THÁNG ==="], ...monthlyData, [""]], papaConfig)
      );
    }

    // Room Statistics
    if (roomStats.length > 0) {
      const totalRoomStats = roomStats.reduce((sum, stat) => sum + stat.count, 0);
      const roomStatsData = [
        ["Loại phòng", "Số lượng", "Tỷ lệ (%)"],
        ...roomStats.map((stat) => {
          const percentage = totalRoomStats > 0 ? ((stat.count / totalRoomStats) * 100).toFixed(2) : "0";
          return [stat.label, stat.count.toString(), percentage];
        }),
      ];
      sections.push(
        Papa.unparse([["=== PHÂN BỔ THEO LOẠI PHÒNG ==="], ...roomStatsData, [""]], papaConfig)
      );
    }

    // Customer Sources
    if (customerSources.length > 0) {
      const totalCustomerSources = customerSources.reduce((sum, source) => sum + source.count, 0);
      const customerSourcesData = [
        ["Nguồn khách", "Số đặt phòng", "Tỷ lệ (%)"],
        ...customerSources.map((source) => {
          const percentage = totalCustomerSources > 0 ? ((source.count / totalCustomerSources) * 100).toFixed(2) : "0";
          return [source.label, source.count.toString(), percentage];
        }),
      ];
      sections.push(
        Papa.unparse([["=== PHÂN BỔ THEO NGUỒN KHÁCH ==="], ...customerSourcesData, [""]], papaConfig)
      );
    }

    // Country Statistics
    if (countryStats.length > 0) {
      const totalCountryStats = countryStats.reduce((sum, stat) => sum + stat.count, 0);
      const countryStatsData = [
        ["Quốc gia", "Số đặt phòng", "Tỷ lệ (%)"],
        ...countryStats.map((stat) => {
          const percentage = totalCountryStats > 0 ? ((stat.count / totalCountryStats) * 100).toFixed(2) : "0";
          return [stat.label, stat.count.toString(), percentage];
        }),
      ];
      sections.push(
        Papa.unparse([["=== PHÂN BỔ THEO QUỐC GIA ==="], ...countryStatsData, [""]], papaConfig)
      );
    }

    // Payment Methods
    if (paymentMethods.length > 0) {
      const totalPaymentMethods = paymentMethods.reduce((sum, method) => sum + method.count, 0);
      const paymentMethodsData = [
        ["Phương thức thanh toán", "Số đặt phòng", "Tỷ lệ (%)"],
        ...paymentMethods.map((method) => {
          const percentage = totalPaymentMethods > 0 ? ((method.count / totalPaymentMethods) * 100).toFixed(2) : "0";
          return [method.label, method.count.toString(), percentage];
        }),
      ];
      sections.push(
        Papa.unparse([["=== PHÂN BỔ THEO PHƯƠNG THỨC THANH TOÁN ==="], ...paymentMethodsData, [""]], papaConfig)
      );
    }

    // Room Statuses
    if (roomStatuses.length > 0) {
      const roomStatusesData = [
        ["Tình trạng", "Số lượng", "Tỷ lệ (%)"],
        ...roomStatuses.map((status) => {
          const percentage = totalRooms > 0 ? ((status.count / totalRooms) * 100).toFixed(2) : "0";
          return [status.label, status.count.toString(), percentage];
        }),
      ];
      sections.push(
        Papa.unparse([["=== TÌNH TRẠNG PHÒNG ==="], ...roomStatusesData, [""]], papaConfig)
      );
    }

    // Recent Payments
    if (recentPaymentsData?.data && recentPaymentsData.data.length > 0) {
      const paymentsData = [
        ["Khách hàng", "Phòng", "Số tiền", "Phương thức", "Trạng thái", "Ngày"],
        ...recentPaymentsData.data.map((payment) => {
          const customerName = payment.bookings?.customers?.full_name || "N/A";
          const roomName = payment.bookings?.rooms?.name || "N/A";
          const amount = formatCurrency(payment.amount);
          const paymentMethod = paymentMethodLabels[payment.payment_method] || payment.payment_method;
          const status = payment.payment_status;
          const date = payment.paid_at
            ? format(new Date(payment.paid_at), "dd/MM/yyyy")
            : format(new Date(payment.created_at), "dd/MM/yyyy");
          return [customerName, roomName, amount, paymentMethod, status, date];
        }),
      ];
      sections.push(
        Papa.unparse([["=== GIAO DỊCH GẦN ĐÂY ==="], ...paymentsData], papaConfig)
      );
    }

    // Combine all sections
    const csvContent = sections.join("\n");

    // Create and download file with BOM for Excel UTF-8 support
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `bao-cao-${format(dateRange.from, "yyyyMMdd")}-${format(dateRange.to, "yyyyMMdd")}-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Báo cáo hệ thống</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi và phân tích hiệu suất hoạt động
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={(values) => {
              if (values.range.from && values.range.to) {
                setDateRange({
                  from: values.range.from,
                  to: values.range.to,
                });
              }
            }}
            showCompare={false}
            locale="vi-VN"
          />
          <Button
            variant="outline"
            size="icon"
            title="Xuất báo cáo"
            onClick={exportReport}
            disabled={isLoadingReports || isLoadingRoomStats || isLoadingCustomerSources || isLoadingCountryStats || isLoadingPaymentMethods || isLoadingRoomStatus || isLoadingRecentPayments}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-500/20 bg-linear-to-br from-green-500/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <div>
              <CardTitle className="text-sm font-medium">
                🟩 Tổng thu (Gross)
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                Theo ngày check-in · không phải doanh thu kế toán theo thanh toán
              </CardDescription>
            </div>
            <div className="rounded-full bg-green-500/10 p-2">
              <IconReceipt className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryStats.revenueByCheckIn)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-linear-to-br from-red-500/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <div>
              <CardTitle className="text-sm font-medium">
                🟥 Tổng hoàn tiền (Refund)
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                Theo thời điểm cập nhật hoàn tiền · khác mốc check-in
              </CardDescription>
            </div>
            <div className="rounded-full bg-red-500/10 p-2">
              <IconTrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summaryStats.refundCashflowByUpdatedAt)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <div>
              <CardTitle className="text-sm font-medium">Tổng đặt phòng</CardTitle>
              <CardDescription className="text-xs pt-1">
                Booking đã xác nhận / in / out, theo ngày check-in
              </CardDescription>
            </div>
            <div className="rounded-full bg-primary/10 p-2">
              <IconBed className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summaryStats.bookingsByCheckIn}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <div>
              <CardTitle className="text-sm font-medium">Night Occupancy</CardTitle>
              <CardDescription className="text-xs pt-1">
                Chỉ tính overnight stay, tối đa 1 phòng / 1 đêm
              </CardDescription>
            </div>
            <div className="rounded-full bg-primary/10 p-2">
              <IconChartBar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summaryStats.occupancyPctFromRoomNights.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        {/*
          Hidden temporarily per request:
          - Room Usage
          - Room Turnover
          - Check-out sớm
          - Phòng bán lại trong ngày
        */}

      </div>

      {!isLoadingUsersKpi &&
        usersKpiData &&
        usersKpiData.some((row) => row.totalBookings > 0) ? (
        <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">KPI theo nhân viên</CardTitle>
                <CardDescription className="text-base mt-1">
                  Theo dõi hiệu suất xử lý booking của từng nhân viên trong khoảng thời gian đã chọn.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Tỷ lệ xử lý = (Confirmed + Check-in + Check-out) / Tổng booking. Tỷ lệ pending = Pending / Tổng booking.
            </p>
            <div className="rounded-md border border-primary/20 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Tổng booking</TableHead>
                    <TableHead className="text-right">Đã xác nhận</TableHead>
                    <TableHead className="text-right">Check-in</TableHead>
                    <TableHead className="text-right">Check-out</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Tỷ lệ xử lý</TableHead>
                    <TableHead className="text-right">Tỷ lệ pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersKpiData.map((row, index) => (
                    <TableRow key={row.userId ?? `unknown-${index}`}>
                      <TableCell className="font-medium">
                        {row.fullName || "Không xác định"}
                        {!row.userId && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (dữ liệu cũ / không gắn user)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.email || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {row.totalBookings}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.confirmedBookings}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.checkedInBookings}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.checkedOutBookings}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.pendingBookings}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {row.processingRate.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-600">
                        {row.pendingRate.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Charts Section */}
      <div className="flex flex-col gap-4">
        <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Doanh thu theo tháng</CardTitle>
                <CardDescription className="text-base mt-1">
                  Biểu đồ doanh thu {monthRange === "6_months" ? "6" : "12"}{" "}
                  tháng gần nhất
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-[140px] border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Doanh thu</SelectItem>
                    <SelectItem value="bookings">Đặt phòng</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={monthRange} onValueChange={setMonthRange}>
                  <SelectTrigger className="w-[140px] border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6_months">6 tháng</SelectItem>
                    <SelectItem value="12_months">1 năm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {isLoadingReports ? (
              <div className="h-[350px] flex items-center justify-center">
                <p className="text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            ) : revenueData.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center">
                <p className="text-muted-foreground">Không có dữ liệu</p>
              </div>
            ) : (
              (() => {
                // Calculate max value for Y-axis domain
                const maxValue =
                  reportType === "revenue"
                    ? Math.max(...revenueData.map((d) => d.revenue || 0), 0)
                    : Math.max(...revenueData.map((d) => d.bookings || 0), 0);

                // Calculate nice rounded max value for better tick distribution
                const getNiceMax = (max: number) => {
                  if (max === 0) return reportType === "revenue" ? 100 : 10;
                  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
                  const normalized = max / magnitude;
                  let niceValue;
                  if (normalized <= 1) niceValue = 1;
                  else if (normalized <= 2) niceValue = 2;
                  else if (normalized <= 5) niceValue = 5;
                  else niceValue = 10;
                  return niceValue * magnitude;
                };

                const niceMax = getNiceMax(maxValue * 1.1);

                return (
                  <ChartContainer
                    config={chartConfig}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={revenueData}
                        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        barCategoryGap="20%"
                      >
                        <defs>
                          <linearGradient
                            id="revenueGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={1}
                            />
                            <stop
                              offset="100%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0.3}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={true}
                          horizontal={true}
                        />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={12}
                          className="text-xs font-medium"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={12}
                          className="text-xs font-medium"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          domain={[0, niceMax]}
                          allowDecimals={false}
                          ticks={[
                            0,
                            niceMax / 4,
                            niceMax / 2,
                            (niceMax * 3) / 4,
                            niceMax,
                          ]}
                          tickFormatter={(value) => {
                            if (reportType === "revenue") {
                              if (value >= 1000000) {
                                return `${(value / 1000000).toFixed(1)}Tr`;
                              } else if (value >= 1000) {
                                return `${(value / 1000).toFixed(0)}K`;
                              } else {
                                return value.toString();
                              }
                            } else {
                              return value.toString();
                            }
                          }}
                        />
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-primary">
                                      {data.month}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-primary" />
                                        <span className="text-xs text-muted-foreground">
                                          Doanh thu
                                        </span>
                                      </div>
                                      <span className="text-sm font-bold text-primary">
                                        {formatCurrency(data.revenue)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-primary/60" />
                                        <span className="text-xs text-muted-foreground">
                                          Đặt phòng
                                        </span>
                                      </div>
                                      <span className="text-sm font-semibold text-primary/80">
                                        {data.bookings} phòng
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ fill: "hsl(var(--primary) / 0.1)" }}
                        />
                        <Bar
                          dataKey={
                            reportType === "revenue" ? "revenue" : "bookings"
                          }
                          fill="url(#revenueGradient)"
                          radius={[12, 12, 0, 0]}
                          className="hover:opacity-100 transition-opacity"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                );
              })()
            )}
          </CardContent>
        </Card>

        {/* Charts Grid - Room Types and Customer Sources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Room Statistics Chart */}
          <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
            <CardHeader>
              <CardTitle className="text-2xl">Loại phòng</CardTitle>
              <CardDescription className="text-base mt-1">
                Phân bổ số lượng phòng theo từng loại
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {isLoadingRoomStats ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
              ) : roomStats.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Không có dữ liệu</p>
                </div>
              ) : (
                <div className="flex justify-center">
                  {/* Donut Chart */}
                  <ChartContainer
                    config={chartConfig}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roomStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, percent }) =>
                            percent > 0 ? `${label}: ${(percent * 100).toFixed(0)}%` : ''
                          }
                          outerRadius={100}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {roomStats.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                ROOM_TYPE_COLORS[
                                index % ROOM_TYPE_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = roomStats.reduce(
                                (sum, stat) => sum + stat.count,
                                0
                              );
                              const percentage =
                                total > 0
                                  ? ((data.count / total) * 100).toFixed(1)
                                  : 0;
                              return (
                                <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-primary">
                                      {data.label}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Số lượng
                                      </span>
                                      <span className="text-sm font-bold text-primary">
                                        {data.count} phòng
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Tỷ lệ
                                      </span>
                                      <span className="text-sm font-semibold text-primary/80">
                                        {percentage}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Sources Chart */}
          <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
            <CardHeader>
              <CardTitle className="text-2xl">Nguồn khách</CardTitle>
              <CardDescription className="text-base mt-1">
                Phân bổ số lượng đặt phòng theo nguồn khách
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {isLoadingCustomerSources ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
              ) : customerSources.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Không có dữ liệu</p>
                </div>
              ) : (
                <div className="flex justify-center">
                  {/* Donut Chart */}
                  <ChartContainer
                    config={chartConfig}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={customerSources}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, percent }) =>
                            percent > 0 ? `${label}: ${(percent * 100).toFixed(0)}%` : ''
                          }
                          outerRadius={100}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {customerSources.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                CUSTOMER_SOURCE_COLORS[
                                index % CUSTOMER_SOURCE_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = customerSources.reduce(
                                (sum, stat) => sum + stat.count,
                                0
                              );
                              const percentage =
                                total > 0
                                  ? ((data.count / total) * 100).toFixed(1)
                                  : 0;
                              return (
                                <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-primary">
                                      {data.label}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Số lượng
                                      </span>
                                      <span className="text-sm font-bold text-primary">
                                        {data.count} đặt phòng
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Tỷ lệ
                                      </span>
                                      <span className="text-sm font-semibold text-primary/80">
                                        {percentage}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid - Country and Payment Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Country Statistics Chart */}
          <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
            <CardHeader>
              <CardTitle className="text-2xl">Quốc gia</CardTitle>
              <CardDescription className="text-base mt-1">
                Phân bổ số lượng đặt phòng theo quốc tịch khách
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {isLoadingCountryStats ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
              ) : countryStats.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Không có dữ liệu</p>
                </div>
              ) : (
                <div className="flex justify-center">
                  <ChartContainer
                    config={chartConfig}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={countryStatsForChart}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, percent }) =>
                            percent >= 0.08 ? `${label}: ${(percent * 100).toFixed(0)}%` : ""
                          }
                          outerRadius={100}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {countryStatsForChart.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                COUNTRY_COLORS[
                                index % COUNTRY_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = countryStatsForChart.reduce(
                                (sum, stat) => sum + stat.count,
                                0
                              );
                              const percentage =
                                total > 0
                                  ? ((data.count / total) * 100).toFixed(1)
                                  : 0;
                              return (
                                <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-primary">
                                      {data.label}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Số lượng
                                      </span>
                                      <span className="text-sm font-bold text-primary">
                                        {data.count} đặt phòng
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Tỷ lệ
                                      </span>
                                      <span className="text-sm font-semibold text-primary/80">
                                        {percentage}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods Chart */}
          <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
            <CardHeader>
              <CardTitle className="text-2xl">Phương thức thanh toán</CardTitle>
              <CardDescription className="text-base mt-1">
                Phân bổ số lượng đặt phòng theo phương thức thanh toán
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {isLoadingPaymentMethods ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">Không có dữ liệu</p>
                </div>
              ) : (
                <div className="flex justify-center">
                  <ChartContainer
                    config={chartConfig}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethods}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, percent }) =>
                            percent > 0 ? `${label}: ${(percent * 100).toFixed(0)}%` : ''
                          }
                          outerRadius={100}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {paymentMethods.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                PAYMENT_METHOD_COLORS[
                                index % PAYMENT_METHOD_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = paymentMethods.reduce(
                                (sum, stat) => sum + stat.count,
                                0
                              );
                              const percentage =
                                total > 0
                                  ? ((data.count / total) * 100).toFixed(1)
                                  : 0;
                              return (
                                <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold text-primary">
                                      {data.label}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Số lượng
                                      </span>
                                      <span className="text-sm font-bold text-primary">
                                        {data.count} đặt phòng
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-muted-foreground">
                                        Tỷ lệ
                                      </span>
                                      <span className="text-sm font-semibold text-primary/80">
                                        {percentage}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Room Status */}
      <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
        <CardHeader>
          <CardTitle className="text-2xl">Tình trạng phòng</CardTitle>
          <CardDescription className="text-base mt-1">
            Theo ngày: số phòng trống và số phòng đã đặt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRoomStatus || isLoadingDailyOccupancy ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : roomStatuses.length === 0 || dailyOccupancy.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">Không có dữ liệu</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const dailyRoomStatus = dailyOccupancy.map((day) => {
                  const bookedRooms =
                    totalRooms > 0
                      ? Math.round((Math.max(day.occupancy, 0) / 100) * totalRooms)
                      : 0;
                  const emptyRooms = Math.max(totalRooms - bookedRooms, 0);

                  return {
                    date: day.date,
                    label: format(new Date(day.date), "dd/MM"),
                    booked: bookedRooms,
                    empty: emptyRooms,
                    occupancy: day.occupancy,
                  };
                });
                const totalDays = dailyRoomStatus.length;
                const criticalEmptyDays = dailyRoomStatus.filter(
                  (day) => day.empty <= Math.max(1, Math.round(totalRooms * 0.1))
                ).length;

                return (
                  <>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dailyRoomStatus}
                          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                          barCategoryGap="32%"
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-xs"
                            interval="preserveStartEnd"
                            minTickGap={22}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            allowDecimals={false}
                            domain={[0, totalRooms]}
                            label={{
                              value: "Phòng",
                              angle: -90,
                              position: "insideLeft",
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 12,
                            }}
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
                                    <p className="mb-2 text-sm font-semibold text-primary">
                                      Ngày {data.label}
                                    </p>
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between gap-4 text-xs">
                                        <span className="text-muted-foreground">Đã đặt</span>
                                        <span className="font-semibold text-red-600">
                                          {data.booked} phòng
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 text-xs">
                                        <span className="text-muted-foreground">Còn trống</span>
                                        <span className="font-semibold text-green-600">
                                          {data.empty} phòng
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 text-xs">
                                        <span className="text-muted-foreground">Night Occupancy</span>
                                        <span className="font-semibold text-primary">
                                          {Number(data.occupancy).toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="booked"
                            stackId="rooms"
                            fill="hsl(0 72% 72%)"
                            name="Đã đặt"
                            maxBarSize={14}
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="empty"
                            stackId="rooms"
                            fill="hsl(142 45% 64%)"
                            name="Còn trống"
                            maxBarSize={14}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span>Đã đặt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span>Còn trống</span>
                      </div>
                      <span>Tổng số phòng: {totalRooms}</span>
                      <span>
                        Ngày gần kín phòng (còn {"<="}10%): {criticalEmptyDays}{" "}
                        / {totalDays}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Giao dịch gần đây</CardTitle>
              <CardDescription className="text-base mt-1">
                10 giao dịch thanh toán mới nhất
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/payments">Xem tất cả</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRecentPayments ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : !recentPaymentsData?.data ||
            recentPaymentsData.data.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">Không có giao dịch</p>
            </div>
          ) : (
            <div className="rounded-md border border-primary/20">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Phòng</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Phương thức</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPaymentsData.data.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.bookings?.customers?.full_name || "N/A"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate block font-medium">
                        {payment.bookings?.rooms?.name || "N/A"}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          {paymentMethodLabels[payment.payment_method] ||
                            payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.payment_status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.paid_at
                          ? new Date(payment.paid_at).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )
                          : new Date(payment.created_at).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

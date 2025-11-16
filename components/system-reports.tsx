"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconCalendar,
  IconFileDownload,
  IconChartBar,
  IconUsers,
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
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { roomTypeLabels } from "@/lib/constants";
import type { Room } from "@/lib/types";

// Mock data for reports
const revenueData = [
  { month: "Tháng 1", revenue: 45000000, bookings: 120 },
  { month: "Tháng 2", revenue: 52000000, bookings: 145 },
  { month: "Tháng 3", revenue: 48000000, bookings: 135 },
  { month: "Tháng 4", revenue: 61000000, bookings: 168 },
  { month: "Tháng 5", revenue: 58000000, bookings: 152 },
  { month: "Tháng 6", revenue: 65000000, bookings: 180 },
];

const dailyReportData = [
  {
    date: "2024-01-15",
    revenue: 2500000,
    bookings: 8,
    checkIns: 5,
    checkOuts: 6,
    occupancy: 85,
  },
  {
    date: "2024-01-16",
    revenue: 3200000,
    bookings: 12,
    checkIns: 8,
    checkOuts: 4,
    occupancy: 92,
  },
  {
    date: "2024-01-17",
    revenue: 2800000,
    bookings: 10,
    checkIns: 6,
    checkOuts: 7,
    occupancy: 88,
  },
  {
    date: "2024-01-18",
    revenue: 3500000,
    bookings: 15,
    checkIns: 10,
    checkOuts: 5,
    occupancy: 95,
  },
  {
    date: "2024-01-19",
    revenue: 2900000,
    bookings: 11,
    checkIns: 7,
    checkOuts: 8,
    occupancy: 90,
  },
  {
    date: "2024-01-20",
    revenue: 4100000,
    bookings: 18,
    checkIns: 12,
    checkOuts: 6,
    occupancy: 98,
  },
  {
    date: "2024-01-21",
    revenue: 3800000,
    bookings: 16,
    checkIns: 9,
    checkOuts: 9,
    occupancy: 94,
  },
];

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

// Colors for pie chart
const ROOM_TYPE_COLORS = [
  "hsl(var(--primary))",
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(47, 96%, 53%)",
];

export function SystemReports() {
  const [timeRange, setTimeRange] = useState("month");
  const [reportType, setReportType] = useState("revenue");
  const [roomStats, setRoomStats] = useState<
    { type: string; label: string; count: number }[]
  >([]);
  const [isLoadingRoomStats, setIsLoadingRoomStats] = useState(true);

  // Fetch room statistics by type
  const fetchRoomStats = useCallback(async () => {
    try {
      setIsLoadingRoomStats(true);
      const supabase = createClient();

      // Fetch all rooms without pagination
      const { data, error } = await supabase
        .from("rooms")
        .select("room_type")
        .is("deleted_at", null);

      if (error) {
        throw new Error(error.message);
      }

      // Count rooms by type
      const typeCounts: Record<string, number> = {
        standard: 0,
        deluxe: 0,
        superior: 0,
        family: 0,
      };

      (data || []).forEach((room: { room_type: Room["room_type"] }) => {
        if (room.room_type && typeCounts[room.room_type] !== undefined) {
          typeCounts[room.room_type]++;
        }
      });

      // Transform to chart data
      const stats = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        label: roomTypeLabels[type as Room["room_type"]],
        count,
      }));

      setRoomStats(stats);
    } catch (err) {
      console.error("Error fetching room stats:", err);
      // Set empty stats on error
      setRoomStats([]);
    } finally {
      setIsLoadingRoomStats(false);
    }
  }, []);

  // Fetch room stats on mount
  useEffect(() => {
    fetchRoomStats();
  }, [fetchRoomStats]);

  // Mock summary stats
  const summaryStats = {
    totalRevenue: 329000000,
    totalBookings: 900,
    averageOccupancy: 89.5,
    totalGuests: 2150,
    revenueGrowth: 12.5,
    bookingGrowth: 8.3,
    occupancyGrowth: 5.2,
    guestGrowth: 15.7,
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
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <IconCalendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hôm nay</SelectItem>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="quarter">Quý này</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="Xuất báo cáo">
            <IconFileDownload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-sm font-medium">
              Tổng doanh thu
            </CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <IconReceipt className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(summaryStats.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {summaryStats.revenueGrowth > 0 ? (
                <IconTrendingUp className="h-3 w-3 text-primary" />
              ) : (
                <IconTrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={
                  summaryStats.revenueGrowth > 0
                    ? "text-primary font-semibold"
                    : "text-destructive"
                }
              >
                {Math.abs(summaryStats.revenueGrowth)}%
              </span>
              <span>so với kỳ trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-sm font-medium">
              Tổng đặt phòng
            </CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <IconBed className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summaryStats.totalBookings}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {summaryStats.bookingGrowth > 0 ? (
                <IconTrendingUp className="h-3 w-3 text-primary" />
              ) : (
                <IconTrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={
                  summaryStats.bookingGrowth > 0
                    ? "text-primary font-semibold"
                    : "text-destructive"
                }
              >
                {Math.abs(summaryStats.bookingGrowth)}%
              </span>
              <span>so với kỳ trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-sm font-medium">Tỷ lệ lấp đầy</CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <IconChartBar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summaryStats.averageOccupancy}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {summaryStats.occupancyGrowth > 0 ? (
                <IconTrendingUp className="h-3 w-3 text-primary" />
              ) : (
                <IconTrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={
                  summaryStats.occupancyGrowth > 0
                    ? "text-primary font-semibold"
                    : "text-destructive"
                }
              >
                {Math.abs(summaryStats.occupancyGrowth)}%
              </span>
              <span>so với kỳ trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-sm font-medium">Tổng khách</CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <IconUsers className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summaryStats.totalGuests}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {summaryStats.guestGrowth > 0 ? (
                <IconTrendingUp className="h-3 w-3 text-primary" />
              ) : (
                <IconTrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={
                  summaryStats.guestGrowth > 0
                    ? "text-primary font-semibold"
                    : "text-destructive"
                }
              >
                {Math.abs(summaryStats.guestGrowth)}%
              </span>
              <span>so với kỳ trước</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="flex flex-col gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Doanh thu theo tháng</CardTitle>
                <CardDescription className="text-base mt-1">
                  Biểu đồ doanh thu 6 tháng gần nhất
                </CardDescription>
              </div>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[140px] border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Doanh thu</SelectItem>
                  <SelectItem value="bookings">Đặt phòng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
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
                    className="stroke-primary/10"
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
                    tickFormatter={(value) =>
                      `${(value / 1000000).toFixed(0)}Tr`
                    }
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
                    dataKey={reportType === "revenue" ? "revenue" : "bookings"}
                    fill="url(#revenueGradient)"
                    radius={[12, 12, 0, 0]}
                    className="hover:opacity-100 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Room Statistics Chart */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader>
            <CardTitle className="text-2xl">
              Thống kê số lượng theo loại phòng
            </CardTitle>
            <CardDescription className="text-base mt-1">
              Biểu đồ phân bố số lượng phòng theo từng loại
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
              <div className="grid gap-6 md:grid-cols-2">
                {/* Bar Chart */}
                <ChartContainer
                  config={chartConfig}
                  className="h-[350px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={roomStats}
                      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      barCategoryGap="20%"
                    >
                      <defs>
                        {roomStats.map((_, index) => (
                          <linearGradient
                            key={`gradient-${index}`}
                            id={`roomGradient-${index}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={
                                ROOM_TYPE_COLORS[
                                  index % ROOM_TYPE_COLORS.length
                                ]
                              }
                              stopOpacity={1}
                            />
                            <stop
                              offset="100%"
                              stopColor={
                                ROOM_TYPE_COLORS[
                                  index % ROOM_TYPE_COLORS.length
                                ]
                              }
                              stopOpacity={0.3}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-primary/10"
                      />
                      <XAxis
                        dataKey="label"
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
                      />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-lg">
                                <div className="mb-2">
                                  <p className="text-sm font-semibold text-primary">
                                    {data.label}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{
                                        backgroundColor:
                                          ROOM_TYPE_COLORS[
                                            roomStats.findIndex(
                                              (s) => s.type === data.type
                                            ) % ROOM_TYPE_COLORS.length
                                          ],
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      Số lượng
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold text-primary">
                                    {data.count} phòng
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ fill: "hsl(var(--primary) / 0.1)" }}
                      />
                      <Bar
                        dataKey="count"
                        radius={[12, 12, 0, 0]}
                        className="hover:opacity-100 transition-opacity"
                      >
                        {roomStats.map((entry, index) => {
                          const color =
                            ROOM_TYPE_COLORS[index % ROOM_TYPE_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                {/* Pie Chart */}
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
                          `${label}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {roomStats.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              ROOM_TYPE_COLORS[index % ROOM_TYPE_COLORS.length]
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
                      <Legend
                        formatter={(value, entry) => (
                          <span className="text-xs text-muted-foreground">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader>
            <CardTitle className="text-2xl">Thống kê hoạt động</CardTitle>
            <CardDescription className="text-base mt-1">
              Phân tích hiệu suất hoạt động
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Tỷ lệ lấp đầy trung bình
                </span>
                <span className="font-semibold">
                  {summaryStats.averageOccupancy}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${summaryStats.averageOccupancy}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Tỷ lệ đặt phòng thành công
                </span>
                <span className="font-semibold">94.5%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: "94.5%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Tỷ lệ hủy đặt phòng
                </span>
                <span className="font-semibold">5.5%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-red-500"
                  style={{ width: "5.5%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Thời gian check-in trung bình
                </span>
                <span className="font-semibold text-primary">12 phút</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: "80%" }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-primary/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Đánh giá khách hàng
                </span>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  4.8/5.0
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Report Table */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader>
          <CardTitle className="text-2xl">Báo cáo chi tiết theo ngày</CardTitle>
          <CardDescription className="text-base mt-1">
            Thống kê doanh thu, đặt phòng và hoạt động hàng ngày
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-primary/20">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Đặt phòng</TableHead>
                  <TableHead className="text-right">Check-in</TableHead>
                  <TableHead className="text-right">Check-out</TableHead>
                  <TableHead className="text-right">Tỷ lệ lấp đầy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyReportData.map((report) => (
                  <TableRow key={report.date}>
                    <TableCell className="font-medium">
                      {new Date(report.date).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(report.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.bookings}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {report.checkIns}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {report.checkOuts}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-primary">
                          {report.occupancy}%
                        </span>
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${report.occupancy}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

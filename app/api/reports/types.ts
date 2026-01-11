export interface ReportSummary {
  totalRevenue: number;
  totalBookings: number;
  averageOccupancy: number;
  totalRefunded: number;
  revenueGrowth: number;
  bookingGrowth: number;
  occupancyGrowth: number;
  refundGrowth: number;
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  bookings: number;
}

export interface DailyReportData {
  date: string;
  revenue: number;
  bookings: number;
  checkIns: number;
  checkOuts: number;
  occupancy: number;
}


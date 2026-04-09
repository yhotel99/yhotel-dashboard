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

export interface UserBookingsKpiRow {
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
}

export interface UserBookingDetailRow {
  id: string;
  bookingCode: string | null;
  customerName: string | null;
  roomName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string | null;
  totalAmount: number;
  createdAt: string | null;
}

/**
 * Operational analytics shapes (dashboard / CSV). Not a unified accounting or hotel-BI model;
 * each metric documents its own time basis.
 */

/**
 * Summary KPIs for the selected `[fromDate, toDate]` window.
 *
 * **Mixed time models (by design for ops dashboards):**
 * - `revenueByCheckIn` / `bookingsByCheckIn` — event-based on `bookings.check_in`
 * - `refundCashflowByUpdatedAt` — transaction-based on `refund_requests.updated_at`
 * - `occupancyPctFromRoomNights` — night occupancy (overnight room-nights only)
 * - `roomUsage` / `roomTurnoverRate` — operational room usage per day, includes short stay + resale
 */
export interface ReportSummary {
  /**
   * Recognized booking revenue for the range: sum of `final_amount ?? total_amount` for
   * `REPORT_METRICS_BOOKING_STATUSES` bookings with `check_in` in the filter window.
   * KPI / ops metric — not P&L by payment date.
   */
  revenueByCheckIn: number;
  /** Count of those same bookings (confirmed | checked_in | checked_out). */
  bookingsByCheckIn: number;
  /**
   * Occupancy % = **sold room-nights** (stays overlapping the range, confirmed+,
   * `booking_rooms` count or 1) ÷ **available room-nights** (sum over each calendar day in the
   * range of inventory room count). Inventory excludes `maintenance` only; per-day
   * count currently uses today’s room snapshot (historical OOO-by-day not in schema yet).
   */
  occupancyPctFromRoomNights: number;
  /** Tổng số lần sử dụng phòng trong kỳ (bao gồm overnight + short stay + bán lại trong ngày). */
  roomUsage: number;
  /** Hiệu suất khai thác phòng = roomUsage / số phòng khả dụng. Có thể > 1. */
  roomTurnoverRate: number;
  /** Số booking check-out thực tế sớm hơn check_out dự kiến trong kỳ. */
  earlyCheckOutCount: number;
  /** Số phòng-ngày có bán lại (cùng 1 phòng được dùng > 1 lần trong ngày). */
  resoldRoomCount: number;
  /**
   * Refund totals in the range by settlement / record time: refunded rows with `updated_at`
   * in the window. Compare carefully to revenue-by-check-in (different time basis).
   */
  refundCashflowByUpdatedAt: number;
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

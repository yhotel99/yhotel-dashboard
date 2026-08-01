/**
 * Operational analytics shapes (dashboard / CSV). Not a unified accounting or hotel-BI model;
 * each metric documents its own time basis.
 */

/**
 * Summary KPIs for the selected `[fromDate, toDate]` window.
 *
 * **Mixed time models (by design for ops dashboards):**
 * - `grossRevenueByPaidAt` — cash-like gross: sum of `payments.amount` with
 *   `payment_status = paid` + `reporting_status = included` and `paid_at` in the window
 * - `netRevenueByPaidAt` — gross minus refunded cashflow in the same window
 * - `revenueByCheckIn` / `bookingsByCheckIn` — booking value / count by `bookings.check_in`
 * - `revenueByCheckOut` / `bookingsByCheckOut` — booking value / count by `actual_check_out` in window
 * - `refundCashflowByUpdatedAt` — transaction-based on `refund_requests.updated_at`
 * - `occupancyPctFromRoomNights` — night occupancy (overnight room-nights only)
 * - `roomUsage` / `roomTurnoverRate` — operational room usage per day, includes short stay + resale
 */
export interface ReportSummary {
  /**
   * Gross thu về theo ngày thanh toán: tổng `payments.amount` có
   * `payment_status = paid` + `reporting_status = included` và `paid_at` trong khoảng lọc
   * (tiền mặt / đã ghi nhận thanh toán tại thời điểm đó).
   */
  grossRevenueByPaidAt: number;
  /**
   * Net tiền còn lại trong túi theo kỳ:
   * `grossRevenueByPaidAt - refundCashflowByUpdatedAt` (không âm).
   */
  netRevenueByPaidAt: number;
  /**
   * Recognized booking revenue for the range: sum of `final_amount ?? total_amount` for
   * `REPORT_METRICS_BOOKING_STATUSES` bookings with `check_in` in the filter window.
   * Khác `grossRevenueByPaidAt` (mốc check-in, không phải ngày paid_at).
   */
  revenueByCheckIn: number;
  /** Count of those same bookings (confirmed | checked_in | checked_out). */
  bookingsByCheckIn: number;
  /**
   * Tổng giá trị booking (`final_amount ?? total_amount`) có `actual_check_out`
   * (checkout thực tế) nằm trong khoảng `[fromDate, toDate]` theo lịch VN.
   * Không tính booking chỉ có ngày check-out dự kiến.
   */
  revenueByCheckOut: number;
  /** Số booking checkout thực tế trong kỳ (cùng tập với `revenueByCheckOut`). */
  bookingsByCheckOut: number;
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
  totalRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  checkedOutBookings: number;
  cancelledBookings: number;
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

/**
 * Per-receptionist cash-in-pocket row.
 * Time basis: payments by `paid_at`, refunds by `updated_at`.
 * Net = collected − refunded (never negative).
 */
export interface ReceptionistRevenueRow {
  userId: string | null;
  fullName: string | null;
  email: string | null;
  /** Tiền đã thu (gross) trong kỳ. */
  collectedGross: number;
  /** Tiền về túi sau trừ hoàn (= net). Alias giữ tương thích UI cũ. */
  roomRevenueCollected: number;
  /** Tổng hoàn tiền đã trừ trong kỳ. */
  refundedAmount: number;
  /** Số lần thanh toán thành công trong kỳ. */
  paymentCount: number;
  /** Số booking liên quan tới các giao dịch trong kỳ. */
  bookingCount: number;
  /** @deprecated dùng bookingCount — giữ để UI cũ không vỡ. */
  checkedOutBookings: number;
  /** @deprecated dùng bookingCount — giữ để UI cũ không vỡ. */
  checkedInBookings: number;
}

/**
 * Hotel-wide + per-receptionist cash-in-pocket report (cùng chuẩn card Net).
 */
export interface ReceptionistRevenueReport {
  fromDate: string;
  toDate: string;
  /** Tổng đã thu (gross) theo paid_at. */
  totalCollectedGross: number;
  /** Tổng hoàn tiền theo updated_at. */
  totalRefundedAmount: number;
  /** Tổng tiền về túi = gross − hoàn. */
  totalRoomRevenueCollected: number;
  /** Tổng số booking liên quan. */
  totalCheckedOutBookings: number;
  /** Tổng số payment thành công trong kỳ. */
  totalPaymentCount: number;
  rows: ReceptionistRevenueRow[];
}

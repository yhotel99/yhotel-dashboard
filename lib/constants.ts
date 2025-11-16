import type { Room } from "./types";
import { formatDate } from "./utils";

/**
 * Room type labels mapping
 */
export const roomTypeLabels: Record<Room["room_type"], string> = {
  standard: "Standard",
  deluxe: "Deluxe",
  superior: "Superior",
  family: "Family",
};

/**
 * Room map status values
 */
export const ROOM_MAP_STATUS = {
  VACANT: "vacant",
  UPCOMING_CHECKIN: "upcoming_checkin",
  OCCUPIED: "occupied",
  UPCOMING_CHECKOUT: "upcoming_checkout",
  OVERDUE_CHECKOUT: "overdue_checkout",
} as const;

/**
 * Room map status type
 */
export type RoomMapStatus =
  | typeof ROOM_MAP_STATUS.VACANT
  | typeof ROOM_MAP_STATUS.UPCOMING_CHECKIN
  | typeof ROOM_MAP_STATUS.OCCUPIED
  | typeof ROOM_MAP_STATUS.UPCOMING_CHECKOUT
  | typeof ROOM_MAP_STATUS.OVERDUE_CHECKOUT;

/**
 * Room map status labels mapping
 */
export const roomMapStatusLabels: Record<RoomMapStatus, string> = {
  [ROOM_MAP_STATUS.VACANT]: "Đang trống",
  [ROOM_MAP_STATUS.UPCOMING_CHECKIN]: "Sắp nhận",
  [ROOM_MAP_STATUS.OCCUPIED]: "Đang sử dụng",
  [ROOM_MAP_STATUS.UPCOMING_CHECKOUT]: "Sắp trả",
  [ROOM_MAP_STATUS.OVERDUE_CHECKOUT]: "Quá giờ trả",
};

/**
 * Room map status colors for map view
 */
export const roomMapStatusColors: Record<RoomMapStatus, string> = {
  [ROOM_MAP_STATUS.VACANT]: "bg-blue-500",
  [ROOM_MAP_STATUS.UPCOMING_CHECKIN]: "bg-orange-500",
  [ROOM_MAP_STATUS.OCCUPIED]: "bg-green-500",
  [ROOM_MAP_STATUS.UPCOMING_CHECKOUT]: "bg-blue-400",
  [ROOM_MAP_STATUS.OVERDUE_CHECKOUT]: "bg-red-500",
};

/**
 * Room map status colors for room card
 */
export const roomMapStatusCardColors: Record<RoomMapStatus, string> = {
  [ROOM_MAP_STATUS.VACANT]: "bg-white border border-gray-200",
  [ROOM_MAP_STATUS.UPCOMING_CHECKIN]: "bg-orange-50 border-2 border-orange-300",
  [ROOM_MAP_STATUS.OCCUPIED]: "bg-green-50 border-2 border-green-400",
  [ROOM_MAP_STATUS.UPCOMING_CHECKOUT]: "bg-blue-50 border-2 border-blue-400",
  [ROOM_MAP_STATUS.OVERDUE_CHECKOUT]: "bg-red-50 border-2 border-red-500",
};

/**
 * Room status values
 */
export const ROOM_STATUS = {
  AVAILABLE: "available",
  MAINTENANCE: "maintenance",
  NOT_CLEAN: "not_clean",
  CLEAN: "clean",
} as const;

/**
 * Room status labels mapping
 */
export const roomStatusLabels: Record<
  (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS],
  string
> = {
  [ROOM_STATUS.AVAILABLE]: "Sẵn sàng",
  [ROOM_STATUS.MAINTENANCE]: "Bảo trì",
  [ROOM_STATUS.NOT_CLEAN]: "Chưa dọn",
  [ROOM_STATUS.CLEAN]: "Đã dọn",
};

/**
 * Booking status values
 */
export const BOOKING_STATUS = {
  PENDING: "pending",
  AWAITING_PAYMENT: "awaiting_payment",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  CHECKED_OUT: "checked_out",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
  REFUNDED: "refunded",
} as const;

/**
 * Booking status labels mapping
 */
export const bookingStatusLabels: Record<
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS],
  string
> = {
  [BOOKING_STATUS.PENDING]: "Chờ xác nhận",
  [BOOKING_STATUS.AWAITING_PAYMENT]: "Chờ thanh toán",
  [BOOKING_STATUS.CONFIRMED]: "Đã xác nhận",
  [BOOKING_STATUS.CHECKED_IN]: "Đã check-in",
  [BOOKING_STATUS.CHECKED_OUT]: "Đã check-out",
  [BOOKING_STATUS.COMPLETED]: "Hoàn tất",
  [BOOKING_STATUS.CANCELLED]: "Đã hủy",
  [BOOKING_STATUS.NO_SHOW]: "Không đến",
  [BOOKING_STATUS.REFUNDED]: "Đã hoàn tiền",
};

/**
 * Booking error message patterns constants
 */
export const BOOKING_ERROR_PATTERNS = {
  ROOM_NOT_AVAILABLE: "Room is not available for the selected date/time",
  CONFLICT_EXCLUSION_CONSTRAINT:
    'conflicting key value violates exclusion constraint "bookings_no_overlap"',
  CONFLICT_EXCLUSION_CONSTRAINT_GENERAL:
    "conflicting key value violates exclusion constraint",
  CHECK_OUT_MUST_BE_LATER: "check_out must be later than check_in",
  NUMBER_OF_NIGHTS_MUST_BE_GREATER: "number_of_nights must be greater than 0",
} as const;

/**
 * Booking error message patterns and their Vietnamese translations
 */
const BOOKING_ERROR_PATTERNS_CONFIG: Array<{
  pattern: string | RegExp;
  message: string;
}> = [
  {
    pattern: BOOKING_ERROR_PATTERNS.ROOM_NOT_AVAILABLE,
    message:
      "Phòng không khả dụng cho khoảng thời gian đã chọn. Đã có booking khác trong khoảng thời gian này. Vui lòng kiểm tra lại lịch đặt phòng và chọn thời gian khác hoặc phòng khác.",
  },
  {
    pattern: BOOKING_ERROR_PATTERNS.CONFLICT_EXCLUSION_CONSTRAINT,
    message:
      "Phòng không khả dụng cho khoảng thời gian đã chọn. Đã có booking khác trong khoảng thời gian này. Vui lòng kiểm tra lại lịch đặt phòng và chọn thời gian khác hoặc phòng khác.",
  },
  {
    pattern: BOOKING_ERROR_PATTERNS.CONFLICT_EXCLUSION_CONSTRAINT_GENERAL,
    message:
      "Phòng không khả dụng cho khoảng thời gian đã chọn. Đã có booking khác trong khoảng thời gian này. Vui lòng kiểm tra lại lịch đặt phòng và chọn thời gian khác hoặc phòng khác.",
  },
  {
    pattern: BOOKING_ERROR_PATTERNS.CHECK_OUT_MUST_BE_LATER,
    message: "Ngày check-out phải sau ngày check-in.",
  },
  {
    pattern: BOOKING_ERROR_PATTERNS.NUMBER_OF_NIGHTS_MUST_BE_GREATER,
    message: "Số đêm phải lớn hơn 0.",
  },
];

/**
 * Translate booking error messages to Vietnamese
 * @param rawMessage Original error message from API/database
 * @param conflictingBooking Optional conflicting booking info for overlap errors
 * @returns Translated error message in Vietnamese
 */
export function translateBookingErrorMessage(
  rawMessage: string,
  conflictingBooking?: { check_in: string; check_out: string } | null
): string {
  if (!rawMessage) return rawMessage;

  // Check for overlap errors
  const isOverlapError = BOOKING_ERROR_PATTERNS_CONFIG.some(({ pattern }) => {
    if (typeof pattern === "string") {
      return (
        rawMessage.includes(pattern) &&
        (pattern.includes(BOOKING_ERROR_PATTERNS.ROOM_NOT_AVAILABLE) ||
          pattern.includes(
            BOOKING_ERROR_PATTERNS.CONFLICT_EXCLUSION_CONSTRAINT_GENERAL
          ))
      );
    }
    return false;
  });

  if (isOverlapError && conflictingBooking) {
    const checkInFormatted = formatDate(conflictingBooking.check_in);
    const checkOutFormatted = formatDate(conflictingBooking.check_out);

    return `Phòng không khả dụng cho khoảng thời gian đã chọn. Đã có booking khác trong khoảng thời gian từ ${checkInFormatted} - ${checkOutFormatted}.`;
  }

  for (const { pattern, message } of BOOKING_ERROR_PATTERNS_CONFIG) {
    if (typeof pattern === "string" && rawMessage.includes(pattern)) {
      return message;
    }
    if (pattern instanceof RegExp && pattern.test(rawMessage)) {
      return message;
    }
  }

  return rawMessage;
}

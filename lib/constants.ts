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

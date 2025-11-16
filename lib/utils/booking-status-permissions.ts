import type { BookingStatus } from "@/hooks/use-bookings";
import type { UserRole } from "@/lib/types";
import { BOOKING_STATUS } from "@/lib/constants";

/**
 * Get allowed status transitions based on user role and current status
 *
 * Admin/Manager: Can change to any status (including rollback)
 * Staff: Can only forward status (confirmed → checked_in → checked_out → completed)
 */
export function getAllowedStatusTransitions(
  currentStatus: BookingStatus,
  userRole: UserRole
): BookingStatus[] {
  // Admin and Manager have full access
  if (userRole === "admin" || userRole === "manager") {
    return Object.values(BOOKING_STATUS) as BookingStatus[];
  }

  // Staff can only forward status in the workflow
  // Workflow: confirmed → checked_in → checked_out → completed
  // Staff cannot rollback, cancel, or change payment status
  switch (currentStatus) {
    case BOOKING_STATUS.PENDING:
      return [
        BOOKING_STATUS.AWAITING_PAYMENT,
        BOOKING_STATUS.CANCELLED, // Khách hủy trước khi thanh toán
      ];

    case BOOKING_STATUS.AWAITING_PAYMENT:
      return [
        BOOKING_STATUS.CONFIRMED, // Khi đã thanh toán
        BOOKING_STATUS.CANCELLED, // Khách hủy trước khi thanh toán
      ];

    case BOOKING_STATUS.CONFIRMED:
      return [
        BOOKING_STATUS.CHECKED_IN,
        BOOKING_STATUS.CANCELLED,
        BOOKING_STATUS.NO_SHOW,
        BOOKING_STATUS.REFUNDED,
      ];

    case BOOKING_STATUS.CHECKED_IN:
      return [
        BOOKING_STATUS.CHECKED_OUT,
        BOOKING_STATUS.COMPLETED, // Trường hợp khách trả phòng gấp
        BOOKING_STATUS.CANCELLED, // Khách hủy trước khi check-in
        BOOKING_STATUS.REFUNDED, // Khách trả phòng gấp
      ];

    case BOOKING_STATUS.CHECKED_OUT:
      return [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.REFUNDED];

    case BOOKING_STATUS.COMPLETED:
      return [];

    // Final states – staff cannot modify
    case BOOKING_STATUS.CANCELLED:
      return [BOOKING_STATUS.REFUNDED];
    case BOOKING_STATUS.NO_SHOW:
      return [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REFUNDED];
    case BOOKING_STATUS.REFUNDED:
      return [];

    default:
      return [];
  }
}

/**
 * Check if a status transition is allowed for the user role
 */
export function isStatusTransitionAllowed(
  currentStatus: BookingStatus,
  newStatus: BookingStatus,
  userRole: UserRole
): boolean {
  const allowedStatuses = getAllowedStatusTransitions(currentStatus, userRole);
  return allowedStatuses.includes(newStatus);
}

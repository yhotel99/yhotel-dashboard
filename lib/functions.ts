import { parse, formatISO } from "date-fns";

// 🎨 Hàm tạo màu gradient ổn định dựa vào user.id
export function generateGradient(id: string) {
  const colors = [
    ["#06b6d4", "#3b82f6"], // cyan → blue
    ["#8b5cf6", "#ec4899"], // violet → pink
    ["#14b8a6", "#22c55e"], // teal → green
    ["#f59e0b", "#ef4444"], // amber → red
    ["#6366f1", "#0ea5e9"], // indigo → sky
  ];
  const index = id ? id.charCodeAt(0) % colors.length : 0;
  const [from, to] = colors[index];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

// 🧠 Hàm lấy chữ cái viết tắt của tên
export function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatDate(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  // Format với cả ngày và giờ cho TIMESTAMPTZ
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper để parse date + time và convert sang ISO string
export function getDateTimeISO(date: string, time: string): string | null {
  if (!date || !time) return null;
  const dt = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return isNaN(dt.getTime()) ? null : formatISO(dt);
}

import { CUSTOMER_ERROR_PATTERNS } from "@/lib/constants";

/**
 * Utility functions for booking operations
 */

/**
 * Calculate number of nights between check-in and check-out dates
 * @param checkIn ISO date string
 * @param checkOut ISO date string
 * @returns Number of nights (rounded up)
 */
export function calculateNightsValue(
  checkIn: string,
  checkOut: string
): number {
  if (!checkIn || !checkOut) return 0;
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (
    isNaN(checkInDate.getTime()) ||
    isNaN(checkOutDate.getTime()) ||
    checkOutDate <= checkInDate
  ) {
    return 0;
  }
  // Tính số đêm = ceil((check_out - check_in) / 1 ngày)
  const diffInMs = checkOutDate.getTime() - checkInDate.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return Math.ceil(diffInDays);
}

/**
 * Format date string for HTML date input (YYYY-MM-DD)
 * @param dateString ISO date string
 * @returns Formatted date string or empty string
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  // Format với cả ngày và giờ cho TIMESTAMPTZ
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format time string for HTML time input (HH:MM)
 * Rounds to nearest 30 minutes
 * @param dateString ISO date string
 * @param defaultTime Default time if dateString is invalid (default: "14:00")
 * @returns Formatted time string
 */
export function formatTimeForInput(
  dateString: string,
  defaultTime: string = "14:00"
): string {
  if (!dateString) return defaultTime;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return defaultTime;
  let hours = date.getHours();
  let minutes = date.getMinutes();
  // Round to nearest 30 minutes
  const roundedMinutes = Math.round(minutes / 30) * 30;
  if (roundedMinutes === 60) {
    hours = (hours + 1) % 24;
    minutes = 0;
  } else {
    minutes = roundedMinutes;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

/**
 * Translate booking error messages to Vietnamese
 * @param rawMessage Original error message
 * @returns Translated error message
 */
export function translateBookingError(rawMessage: string): string {
  if (
    rawMessage.includes("Room is not available for the selected date/time") ||
    rawMessage.includes(
      'conflicting key value violates exclusion constraint "bookings_no_overlap"'
    )
  ) {
    return "Phòng không khả dụng cho khoảng thời gian đã chọn. Vui lòng chọn phòng hoặc thời gian khác.";
  }
  if (rawMessage.includes("check_out must be later than check_in")) {
    return "Ngày check-out phải sau ngày check-in.";
  }
  if (rawMessage.includes("number_of_nights must be greater than 0")) {
    return "Số đêm phải lớn hơn 0.";
  }
  return rawMessage;
}

/**
 * Translate customer error messages to Vietnamese
 * @param rawMessage Original error message
 * @returns Translated error message
 */
export function translateCustomerError(rawMessage: string): string {
  if (
    rawMessage.includes(CUSTOMER_ERROR_PATTERNS.DUPLICATE_EMAIL_KEY) ||
    rawMessage.includes(CUSTOMER_ERROR_PATTERNS.DUPLICATE_KEY_GENERAL) ||
    rawMessage.includes(CUSTOMER_ERROR_PATTERNS.DUPLICATE_EMAIL_KEY_SHORT)
  ) {
    return "Email này đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.";
  }
  return rawMessage;
}

/**
 * Format number with thousand separators (1.000.000)
 * @param value - Number or string to format
 * @returns Formatted string with thousand separators
 */
export function formatNumberWithSeparators(value: number | string): string {
  if (value === "" || value === null || value === undefined) return "";

  // If string, remove all dots first (in case user is typing)
  let numValue: number;
  if (typeof value === "string") {
    // Remove all non-digit characters except for potential decimal point
    // For now, we only handle integers
    const cleaned = value.replace(/[^\d]/g, "");
    numValue = cleaned === "" ? 0 : parseFloat(cleaned);
  } else {
    numValue = value;
  }

  if (isNaN(numValue) || numValue < 0) return "";

  // Format with thousand separators (no decimals for VND)
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
}

/**
 * Parse formatted number string back to number
 * @param value - Formatted string (e.g., "1.000.000")
 * @returns Parsed number
 */
export function parseFormattedNumber(value: string): number {
  if (!value) return 0;
  // Remove all dots (thousand separators)
  const cleaned = value.replace(/\./g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

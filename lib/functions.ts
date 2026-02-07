import { parse, formatISO, format, parseISO } from "date-fns";
import { CUSTOMER_ERROR_PATTERNS } from "@/lib/constants";

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

/**
 * Format currency to VND
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Format number to Vietnamese locale with VNĐ suffix
 * @param amount - Number to format
 * @returns Formatted number string with VNĐ suffix (e.g., "1.000.000 VNĐ")
 */
export function formatVND(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)} VNĐ`;
}

/**
 * Format date with time (for TIMESTAMPTZ)
 * @param dateString - ISO date string
 * @returns Formatted date string with time or "-" if invalid
 */
export function formatDate(dateString: string): string {
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

/**
 * Format date only (without time)
 * @param dateString - ISO date string
 * @returns Formatted date string (DD/MM/YYYY) or "-" if invalid
 */
export function formatDateOnly(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format date string for display (dd/MM/yyyy)
 * Used for date picker display values
 * @param value - Date string (ISO or YYYY-MM-DD format)
 * @returns Formatted date string (dd/MM/yyyy) or null if invalid
 */
export function formatDisplayDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return format(parseISO(value), "dd/MM/yyyy");
  } catch {
    return null;
  }
}

// Helper để parse date + time và convert sang ISO string
export function getDateTimeISO(date: string, time: string): string | null {
  if (!date || !time) return null;
  const dt = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return isNaN(dt.getTime()) ? null : formatISO(dt);
}

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
 * Convert ISO date string to YYYY-MM-DD format for HTML date input
 * @param isoDate - ISO date string
 * @returns Formatted date string (YYYY-MM-DD) or empty string if invalid
 */
export function formatDateForInput(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper function to convert date string to ISO string (with default time)
 * Check-in default: 14:00, Check-out default: 12:00
 * @param date - Date string in YYYY-MM-DD format
 * @param isCheckOut - Whether this is a check-out date
 * @returns ISO date string or null if invalid
 */
export function getDateISO(
  date: string,
  isCheckOut: boolean = false
): string | null {
  if (!date) return null;
  // Format: yyyy-MM-dd
  // Add default time: 14:00 for check-in, 12:00 for check-out
  const time = isCheckOut ? "12:00" : "14:00";
  const dateTimeString = `${date} ${time}`;
  const dateObj = new Date(dateTimeString);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString();
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
  // Lỗi về phòng không khả dụng
  if (
    rawMessage.includes("Room is not available for the selected date/time") ||
    rawMessage.includes('conflicting key value violates exclusion constraint "bookings_no_overlap"')
  ) {
    return "🚫 Phòng này đã có người đặt trong khoảng thời gian bạn chọn. Vui lòng chọn phòng khác hoặc thay đổi thời gian.";
  }

  // Lỗi về ngày tháng
  if (rawMessage.includes("check_out must be later than check_in")) {
    return "📅 Ngày trả phòng phải sau ngày nhận phòng. Vui lòng kiểm tra lại lịch đặt.";
  }
  if (rawMessage.includes("number_of_nights must be greater than 0")) {
    return "📅 Số đêm lưu trú phải lớn hơn 0. Vui lòng kiểm tra ngày nhận/trả phòng.";
  }

  // Lỗi về số tiền
  if (rawMessage.includes("amount must be >= 0")) {
    return "💰 Số tiền phải lớn hơn hoặc bằng 0. Vui lòng kiểm tra lại tổng tiền và tiền cọc.";
  }
  if (rawMessage.includes("advance_payment cannot exceed total_amount")) {
    return "💰 Tiền cọc không được vượt quá tổng tiền phòng. Vui lòng giảm tiền cọc hoặc tăng tổng tiền.";
  }

  // Lỗi về dữ liệu không tồn tại
  if (rawMessage.includes("Customer not found") || rawMessage.includes("customer_id")) {
    return "👤 Khách hàng không tồn tại. Vui lòng chọn khách hàng khác.";
  }
  if (rawMessage.includes("Room not found") || rawMessage.includes("room_id")) {
    return "🏠 Phòng không tồn tại. Vui lòng chọn phòng khác.";
  }

  // Lỗi về quyền truy cập
  if (rawMessage.includes("permission denied") || rawMessage.includes("access denied")) {
    return "🔒 Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ quản trị viên.";
  }

  // Lỗi về kết nối database
  if (rawMessage.includes("connection") || rawMessage.includes("timeout")) {
    return "🌐 Lỗi kết nối mạng. Vui lòng thử lại sau.";
  }

  // Lỗi chung về dữ liệu không hợp lệ
  if (rawMessage.includes("invalid") || rawMessage.includes("null value")) {
    return "⚠️ Dữ liệu nhập không hợp lệ. Vui lòng kiểm tra lại thông tin.";
  }

  // Lỗi hệ thống
  if (rawMessage.includes("internal error") || rawMessage.includes("unexpected error")) {
    return "🚨 Lỗi hệ thống. Vui lòng thử lại hoặc liên hệ bộ phận kỹ thuật.";
  }

  // Nếu không match được lỗi nào, trả về message gốc nhưng làm cho nó thân thiện hơn
  return `❌ Có lỗi xảy ra: ${rawMessage}. Vui lòng thử lại hoặc liên hệ hỗ trợ.`;
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

/**
 * Validate file type
 * @param file - File to validate
 * @returns True if file is an image
 */
export function isValidImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Generate unique file name
 * @param file - File to generate name for
 * @returns Unique file name
 */
export function generateFileName(file: File): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  const extension = file.name.split(".").pop();
  const sanitizedName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  return `${sanitizedName}_${timestamp}_${randomString}.${extension}`;
}


export function formatDateTimePretty(isoString: string, options: {
  timeZone?: number;
  showIcons?: boolean;
  format?: "full" | "time" | "date";
} = {}): string {
  const {
    timeZone = 7, // Múi giờ Việt Nam (+7)
    showIcons = true, // Hiển thị biểu tượng
    format = "full" // "full" | "time" | "date"
  } = options;
  
  const date = new Date(isoString);
  
  if (isNaN(date.getTime())) {
    return showIcons ? "⏰ --:-- | 📅 Ngày không hợp lệ" : "--:-- | Ngày không hợp lệ";
  }
  
  // Chuyển sang múi giờ chỉ định
  const localDate = new Date(date.getTime() + timeZone * 60 * 60 * 1000);
  
  // Lấy các thành phần
  const hours = localDate.getUTCHours().toString().padStart(2, '0');
  const minutes = localDate.getUTCMinutes().toString().padStart(2, '0');
  const day = localDate.getUTCDate();
  const month = localDate.getUTCMonth() + 1;
  const year = localDate.getUTCFullYear();
  
  // Tên thứ
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const weekday = weekdays[localDate.getUTCDay()];
  
  // Tạo chuỗi kết quả
  const timeStr = `${hours}:${minutes}`;
  const dateStr = `${weekday}, ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  
  // Format theo tùy chọn
  if (format === "time") {
    return showIcons ? `⏰ ${timeStr}` : timeStr;
  }
  
  if (format === "date") {
    return showIcons ? `📅 ${dateStr}` : dateStr;
  }
  
  // Format mặc định (full)
  return showIcons ? `⏰ ${timeStr} | 📅 ${dateStr}` : `${timeStr} | ${dateStr}`;
}



export function mapBookingError(code: string): string {
 switch (code) {
   case "ROOM_NOT_AVAILABLE":
     return "Phòng đã được đặt trong thời gian này";
   case "INVALID_DATE_RANGE":
     return "Ngày check-out phải sau check-in";
   case "INVALID_NIGHTS":
     return "Số đêm không hợp lệ";
   case "INVALID_AMOUNT":
     return "Số tiền không hợp lệ";
   case "ADVANCE_EXCEEDS_TOTAL":
     return "Tiền cọc không được lớn hơn tổng tiền";
   case "NO_ROOMS":
     return "Vui lòng chọn ít nhất một phòng";
   default:
     return "Không thể tạo booking";
 }
}
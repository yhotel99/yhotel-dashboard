import { parse, formatISO, format, parseISO } from "date-fns";
import { CUSTOMER_ERROR_PATTERNS, roomTypeLabels } from "@/lib/constants";
import type {
  BookingRoomNumbersSlice,
  CheckoutSessionRoom,
  RoomType,
} from "@/lib/types";

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
 * Format date with time including seconds (for TIMESTAMPTZ)
 * @param dateString - ISO date string
 * @returns Formatted date string with day/time/seconds or "-" if invalid
 */
export function formatDateTimeWithSeconds(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

function collectBookingRoomIds(booking: BookingRoomNumbersSlice): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const push = (id: string | null | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const br of booking.booking_rooms ?? []) {
    push(br.room_id);
  }
  for (const it of booking.rooms?.items ?? []) {
    push(it.id);
  }
  push(booking.room_id);
  return ids;
}

/**
 * Chuỗi số phòng trên bảng booking. Nếu có `roomNumberById` (lookup từ bảng rooms như /dashboard/rooms),
 * resolve theo id phòng từ booking; không thì dùng room_number có sẵn trong payload.
 */
export function formatBookingRoomNumbersLabel(
  booking: BookingRoomNumbersSlice,
  roomNumberById?: Readonly<Record<string, string>>
): string {
  if (roomNumberById && Object.keys(roomNumberById).length > 0) {
    const labels: string[] = [];
    const usedNums = new Set<string>();
    for (const id of collectBookingRoomIds(booking)) {
      const n = roomNumberById[id];
      if (n && !usedNums.has(n)) {
        usedNums.add(n);
        labels.push(n);
      }
    }
    if (labels.length > 0) {
      return labels.join(", ");
    }
  }

  if (booking.booking_rooms && booking.booking_rooms.length > 0) {
    const nums = booking.booking_rooms
      .map((br) => br.rooms.room_number)
      .filter((n): n is string => Boolean(n && String(n).trim()));
    const sorted = [...new Set(nums)].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
    if (sorted.length > 0) {
      return sorted.join(", ");
    }
  }
  const single = booking.rooms?.room_number;
  if (single && String(single).trim()) {
    return String(single).trim();
  }
  const fromItems = booking.rooms?.items
    ?.map((it) => it.room_number)
    .filter((n): n is string => Boolean(n && String(n).trim()));
  if (fromItems?.length) {
    return [...new Set(fromItems)].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    ).join(", ");
  }
  return "-";
}

/**
 * Số phòng từ lookup; nếu chưa resolve được thì hiện tên loại phòng (`rooms.name`) thay cho "-".
 */
export function formatRoomNumbersWithTypeNameFallback(
  slice: BookingRoomNumbersSlice,
  roomNumberById?: Readonly<Record<string, string>>
): string {
  const n = formatBookingRoomNumbersLabel(slice, roomNumberById);
  if (n !== "-") return n;
  const name = slice.rooms?.name?.trim();
  return name || "-";
}

function checkoutSessionRoomTypeLabel(room: CheckoutSessionRoom): string {
  const type = room.room_type;
  if (type && type in roomTypeLabels) {
    return roomTypeLabels[type as RoomType];
  }
  return room.name?.trim() || room.category_code?.trim() || "";
}

function formatCheckoutSessionRoomPart(
  room: CheckoutSessionRoom,
  roomNumberById: Readonly<Record<string, string>> | undefined,
  includeAmount: boolean
): string {
  const number = (
    roomNumberById?.[room.id] ||
    room.room_number ||
    ""
  ).trim();
  const typeLabel = checkoutSessionRoomTypeLabel(room);
  const nights =
    room.number_of_nights > 0 ? `${room.number_of_nights} đêm` : "";
  const parts = [number, typeLabel, nights].filter(Boolean);
  if (includeAmount && room.amount > 0) {
    parts.push(formatCurrency(room.amount));
  }
  return parts.join(" · ");
}

/**
 * Một chuỗi phòng cho bảng checkout_sessions: số · loại · số đêm.
 * Lookup số phòng từ bảng rooms khi có; tooltip nên gọi với includeAmount.
 */
export function formatCheckoutSessionRoomsLabel(
  rooms: CheckoutSessionRoom[],
  roomNumberById?: Readonly<Record<string, string>>,
  options?: { includeAmount?: boolean }
): string {
  if (!rooms.length) return "-";
  const includeAmount = options?.includeAmount === true;
  const labels = rooms
    .map((room) =>
      formatCheckoutSessionRoomPart(room, roomNumberById, includeAmount)
    )
    .filter(Boolean);
  if (labels.length === 0) return "-";
  return includeAmount ? labels.join("\n") : labels.join("; ");
}

/**
 * Get date part YYYY-MM-DD from ISO or YYYY-MM-DD string (local date, no TZ shift)
 */
function toDatePart(isoOrDate: string): string {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calculate number of nights between check-in and check-out dates.
 * Same calendar day (check-in and check-out on the same day) counts as 1 night.
 * @param checkIn ISO date string
 * @param checkOut ISO date string
 * @returns Number of nights (rounded up); same day = 1
 */
export function calculateNightsValue(
  checkIn: string,
  checkOut: string
): number {
  if (!checkIn || !checkOut) return 0;
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return 0;
  }
  const inPart = toDatePart(checkIn);
  const outPart = toDatePart(checkOut);
  // Cùng ngày → tính 1 đêm (day use)
  if (inPart && outPart && inPart === outPart) return 1;
  if (checkOutDate <= checkInDate) return 0;
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
 * Check-in ISO for booking: cùng ngày (day use) dùng 00:00 để khách có thể vào
 * sớm (vd 2h sáng) và trả phòng 12:00; nhiều ngày dùng 14:00. Dùng khi build payload.
 */
export function getCheckInDateISO(
  checkInDate: string,
  checkOutDate: string
): string | null {
  if (!checkInDate) return null;
  const sameDay =
    checkInDate &&
    checkOutDate &&
    toDatePart(checkInDate) === toDatePart(checkOutDate);
  const time = sameDay ? "00:00" : "14:00";
  const dateTimeString = `${checkInDate} ${time}`;
  const dateObj = new Date(dateTimeString);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString();
}

/**
 * Check-out ISO for booking: luôn 12:00. Cùng ngày thì check_in dùng getCheckInDateISO
 * (00:00) nên 12:00 vẫn > check_in, DB hợp lệ.
 */
export function getCheckOutDateISO(
  _checkInDate: string,
  checkOutDate: string
): string | null {
  return getDateISO(checkOutDate, true);
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
  if (rawMessage.includes("ROOM_HELD_BY_CHECKOUT")) {
    return "Phòng đang được khách giữ để thanh toán online. Đây không phải lỗi hệ thống — vui lòng đợi hết phiên thanh toán hoặc chọn phòng khác.";
  }

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
 * Translate room error messages to Vietnamese
 * @param rawMessage Original error message
 * @param errorCode Optional error code from database
 * @returns Translated error message
 */
export function translateRoomError(rawMessage: string, errorCode?: string): string {
  // Check for duplicate room number
  if (
    rawMessage.includes("rooms_room_number_key") ||
    rawMessage.includes("duplicate key value violates unique constraint")
  ) {
    return "Số phòng này đã tồn tại trong hệ thống. Vui lòng sử dụng số phòng khác.";
  }
  
  // Check for foreign key violations (room has bookings)
  if (
    errorCode === "23503" ||
    rawMessage.includes("foreign key constraint") ||
    rawMessage.includes("violates foreign key")
  ) {
    return "Không thể xóa phòng này vì đang có đơn đặt phòng liên quan. Vui lòng kiểm tra lại.";
  }
  
  return rawMessage;
}

/**
 * Translate payment error messages to Vietnamese
 * @param rawMessage Original error message
 * @returns Translated error message
 */
export function translatePaymentError(rawMessage: string): string {
  if (rawMessage.includes("foreign key constraint")) {
    return "Không thể thực hiện thao tác này vì có dữ liệu liên quan. Vui lòng kiểm tra lại.";
  }
  
  if (rawMessage.includes("check constraint")) {
    return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin thanh toán.";
  }
  
  if (rawMessage.includes("not found") || rawMessage.includes("does not exist")) {
    return "Không tìm thấy thông tin thanh toán. Vui lòng thử lại.";
  }
  
  return "Không thể xử lý thanh toán. Vui lòng thử lại sau.";
}

/**
 * Translate profile/auth error messages to Vietnamese
 * @param rawMessage Original error message
 * @returns Translated error message
 */
export function translateProfileError(rawMessage: string): string {
  if (rawMessage.includes("Invalid login credentials")) {
    return "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại email và mật khẩu.";
  }
  
  if (rawMessage.includes("Email not confirmed")) {
    return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và xác nhận email.";
  }
  
  if (rawMessage.includes("User already registered")) {
    return "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.";
  }
  
  if (rawMessage.includes("Password should be at least")) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }
  
  if (rawMessage.includes("duplicate key value") && rawMessage.includes("email")) {
    return "Email này đã tồn tại trong hệ thống.";
  }
  
  if (rawMessage.includes("foreign key constraint")) {
    return "Không thể cập nhật thông tin vì có dữ liệu liên quan.";
  }
  
  return "Không thể cập nhật thông tin. Vui lòng thử lại sau.";
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
  const cleaned = value.replace(/\D/g, "");
  if (cleaned === "") return 0;
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
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



export type MapBookingErrorDetails = {
  hold_expires_at?: string | null;
};

export function mapBookingError(
  code: string,
  details?: MapBookingErrorDetails
): string {
  switch (code) {
    case "ROOM_HELD_BY_CHECKOUT": {
      const expiresAt = details?.hold_expires_at
        ? new Date(details.hold_expires_at)
        : null;
      const expiresLabel =
        expiresAt && !Number.isNaN(expiresAt.getTime())
          ? expiresAt.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
      return expiresLabel
        ? `Phòng đang được khách giữ để thanh toán online (hết hạn khoảng ${expiresLabel}). Đây không phải lỗi hệ thống — vui lòng đợi hoặc chọn phòng khác.`
        : "Phòng đang được khách giữ để thanh toán online. Đây không phải lỗi hệ thống — vui lòng đợi hết phiên thanh toán hoặc chọn phòng khác.";
    }
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
import type { Room } from "@/lib/types";
import { formatDate } from "@/lib/functions";
import {
  IconChartBar,
  IconCreditCard,
  IconDashboard,
  IconInnerShadowTop,
  IconReceiptRefund,
  IconNews,
  IconHistory,
  IconFileText,
  IconWifi,
  IconParking,
  IconSnowflake,
  IconFridge,
  IconCoffee,
  IconLock,
  IconBuildingSkyscraper,
  IconWind,
  IconBottle,
  IconToolsKitchen2,
  IconIroning,
  IconCar,
  IconMapPin,
  IconClock24,
  IconTeapot,
} from "@tabler/icons-react";
import { 
  HotelIcon, 
  Images, 
  User2, 
  UserCircle, 
  Bath,
  ShowerHead,
} from "lucide-react";

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
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  CHECKED_OUT: "checked_out",
  CANCELLED: "cancelled",
} as const;

/**
 * Booking status labels mapping
 */
export const bookingStatusLabels: Record<
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS],
  string
> = {
  [BOOKING_STATUS.PENDING]: "Chờ xác nhận",
  [BOOKING_STATUS.CONFIRMED]: "Đã xác nhận",
  [BOOKING_STATUS.CHECKED_IN]: "Đã check-in",
  [BOOKING_STATUS.CHECKED_OUT]: "Đã check-out",
  [BOOKING_STATUS.CANCELLED]: "Đã hủy",
};

/**
 * Payment type values
 */
export const PAYMENT_TYPE = {
  ROOM_CHARGE: "room_charge",
  ADVANCE_PAYMENT: "advance_payment",
  EXTRA_SERVICE: "extra_service",
} as const;

/**
 * Payment type labels mapping
 */
export const paymentTypeLabels: Record<
  (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE],
  string
> = {
  [PAYMENT_TYPE.ROOM_CHARGE]: "Tiền phòng",
  [PAYMENT_TYPE.ADVANCE_PAYMENT]: "Tiền cọc",
  [PAYMENT_TYPE.EXTRA_SERVICE]: "Dịch vụ thêm",
};

/**
 * Payment method values
 */
export const PAYMENT_METHOD = {
  BANK_TRANSFER: "bank_transfer",
  PAY_AT_HOTEL: "pay_at_hotel",
  ONEPAY: "onepay"
} as const;

/**
 * Payment method labels mapping
 */
export const paymentMethodLabels: Record< 
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD],
  string
> = {
  [PAYMENT_METHOD.BANK_TRANSFER]: "Chuyển khoản",
  [PAYMENT_METHOD.PAY_AT_HOTEL]: "Thanh toán tại khách sạn",
  [PAYMENT_METHOD.ONEPAY]: "OnePay"
};

/**
 * Payment status values
 */
export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const;

/**
 * Payment status labels mapping
 */
export const paymentStatusLabels: Record<
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS],
  string
> = {
  [PAYMENT_STATUS.PENDING]: "Chờ thanh toán",
  [PAYMENT_STATUS.PAID]: "Đã thanh toán",
  [PAYMENT_STATUS.FAILED]: "Thanh toán thất bại",
  [PAYMENT_STATUS.REFUNDED]: "Đã hoàn tiền",
  [PAYMENT_STATUS.CANCELLED]: "Đã hủy",
};

/**
 * User status values
 */
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const;

/**
 * User role values
 */
export const USER_ROLE = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const;

/**
 * User status labels mapping
 */
export const userStatusLabels: Record<
  (typeof USER_STATUS)[keyof typeof USER_STATUS],
  string
> = {
  [USER_STATUS.ACTIVE]: "Hoạt động",
  [USER_STATUS.INACTIVE]: "Vô hiệu hóa",
  [USER_STATUS.SUSPENDED]: "Tạm khóa",
};

/**
 * Refund request status values
 */
export const REFUND_REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  REFUNDED: "refunded",
} as const;

/**
 * Refund request status labels mapping
 */
export const refundRequestStatusLabels: Record<
  (typeof REFUND_REQUEST_STATUS)[keyof typeof REFUND_REQUEST_STATUS],
  string
> = {
  [REFUND_REQUEST_STATUS.PENDING]: "Chờ duyệt",
  [REFUND_REQUEST_STATUS.APPROVED]: "Đã duyệt",
  [REFUND_REQUEST_STATUS.REJECTED]: "Từ chối",
  [REFUND_REQUEST_STATUS.REFUNDED]: "Đã hoàn tiền",
};

/**
 * Customer source values
 */
export const CUSTOMER_SOURCE = {
  WEBSITE: "website",
  AGODA: "agoda",
  BOOKING: "booking",
  TRAVELOKA: "traveloka",
  OTHER: "khác",
} as const;

/**
 * Customer source labels mapping
 */
export const customerSourceLabels: Record<
  (typeof CUSTOMER_SOURCE)[keyof typeof CUSTOMER_SOURCE],
  string
> = {
  [CUSTOMER_SOURCE.WEBSITE]: "Website",
  [CUSTOMER_SOURCE.AGODA]: "Agoda",
  [CUSTOMER_SOURCE.BOOKING]: "Booking",
  [CUSTOMER_SOURCE.TRAVELOKA]: "Traveloka",
  [CUSTOMER_SOURCE.OTHER]: "Khác",
};

/**
 * Booking error message patterns constants
 */
/**
 * Customer error patterns for database constraint violations
 */
/**
 * Sidebar navigation URLs
 */
export const SIDEBAR_URLS = {
  DASHBOARD: "/dashboard",
  ROOMS: "/dashboard/rooms",
  BOOKINGS: "/dashboard/bookings",
  RESERVATION: "/dashboard/reservation",
  CUSTOMERS: "/dashboard/customers",
  PAYMENTS: "/dashboard/payments",
  PAYMENT_LOGS: "/dashboard/payment-logs",
  REFUND_REQUESTS: "/dashboard/refund-requests",
  AUDIT_LOGS: "/dashboard/audit-logs",
  GALLERY: "/dashboard/gallery",
  USERS: "/dashboard/users",
  BLOGS: "/dashboard/blogs",
} as const;

export const CUSTOMER_ERROR_PATTERNS = {
  DUPLICATE_EMAIL_KEY:
    'duplicate key value violates unique constraint "customers_email_key"',
  DUPLICATE_EMAIL_KEY_SHORT: "customers_email_key",
  DUPLICATE_KEY_GENERAL: "duplicate key value violates unique constraint",
} as const;

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

export const PATH_TO_RESOURCE: Record<string, string> = {
  [SIDEBAR_URLS.DASHBOARD]: "dashboard",
  [SIDEBAR_URLS.ROOMS]: "rooms",
  [SIDEBAR_URLS.BOOKINGS]: "bookings",
  [SIDEBAR_URLS.RESERVATION]: "reservations",
  [SIDEBAR_URLS.CUSTOMERS]: "customers",
  [SIDEBAR_URLS.PAYMENTS]: "payments",
  [SIDEBAR_URLS.PAYMENT_LOGS]: "payment-logs",
  [SIDEBAR_URLS.REFUND_REQUESTS]: "refund-requests",
  [SIDEBAR_URLS.AUDIT_LOGS]: "audit-logs",
  [SIDEBAR_URLS.GALLERY]: "gallery",
  [SIDEBAR_URLS.USERS]: "users",
  [SIDEBAR_URLS.BLOGS]: "blogs",
};

export const allNavItems = [
  {
    title: "Tổng Quan",
    url: SIDEBAR_URLS.DASHBOARD,
    icon: IconDashboard,
    resource: "dashboard",
  },
  {
    title: "Phòng Khách Sạn",
    url: SIDEBAR_URLS.ROOMS,
    icon: HotelIcon,
    resource: "rooms",
  },
  {
    title: "Đặt Chỗ",
    url: SIDEBAR_URLS.RESERVATION,
    icon: IconInnerShadowTop,
    resource: "reservations",
  },
  {
    title: "Đơn Đặt Phòng",
    url: SIDEBAR_URLS.BOOKINGS,
    icon: IconChartBar,
    resource: "bookings",
  },

  {
    title: "Khách Hàng",
    url: SIDEBAR_URLS.CUSTOMERS,
    icon: UserCircle,
    resource: "customers",
  },
  {
    title: "Thanh Toán",
    url: SIDEBAR_URLS.PAYMENTS,
    icon: IconCreditCard,
    resource: "payments",
  },
  {
    title: "Lịch Sử Webhook",
    url: SIDEBAR_URLS.PAYMENT_LOGS,
    icon: IconHistory,
    resource: "payment-logs",
  },
  {
    title: "Hoàn Tiền",
    url: SIDEBAR_URLS.REFUND_REQUESTS,
    icon: IconReceiptRefund,
    resource: "refund-requests",
  },
  {
    title: "Nhật Ký Hệ Thống",
    url: SIDEBAR_URLS.AUDIT_LOGS,
    icon: IconFileText,
    resource: "audit-logs",
  },
  {
    title: "Bộ Sưu Tập Ảnh",
    url: SIDEBAR_URLS.GALLERY,
    icon: Images,
    resource: "gallery",
  },
  {
    title: "Blog",
    url: "/dashboard/blogs",
    icon: IconNews,
    resource: "blogs",
  },
  {
    title: "Người Dùng",
    url: SIDEBAR_URLS.USERS,
    icon: User2,
    resource: "users",
  },
];


export const AMENITIES_OPTIONS = [
  { label: "WiFi Tốc độ cao", value: "wifi_high_speed", icon: IconWifi },
  { label: "Bãi đỗ xe", value: "parking", icon: IconParking },
  { label: "Điều hòa", value: "air_conditioning", icon: IconSnowflake },
  { label: "Tủ lạnh nhỏ", value: "mini_fridge", icon: IconFridge },
  { label: "Trà & Cà phê", value: "tea_coffee", icon: IconCoffee },
  { label: "Cà phê", value: "coffee", icon: IconCoffee },
  { label: "Tủ sắt", value: "safe_box", icon: IconLock },
  { label: "Ban công", value: "balcony", icon: IconBuildingSkyscraper },
  { label: "Phòng tắm đứng", value: "shower", icon: Bath },
  { label: "Vòi sen", value: "shower_head", icon: ShowerHead },
  { label: "Máy sấy tóc", value: "hair_dryer", icon: IconWind },
  { label: "Ấm đun nước siêu tốc", value: "electric_kettle", icon: IconTeapot },
  { label: "Nước uống đóng chai miễn phí", value: "free_bottled_water", icon: IconBottle },
  { label: "Có phục vụ bữa sáng", value: "breakfast_service", icon: IconToolsKitchen2 },
  { label: "Bàn tiếp tân 24h", value: "reception_24h", icon: IconClock24 },
  { label: "Giặt ủi", value: "laundry", icon: IconIroning },
  { label: "Hỗ trợ liên hệ Tài Xế", value: "taxi_support", icon: IconCar },
  { label: "Hỗ trợ liên hệ Tour du lịch", value: "tour_support", icon: IconMapPin },
];


export const DASHBOARD_URLS = {
  DASHBOARD: "/dashboard",
  ROOMS: "/dashboard/rooms",
  BOOKINGS: "/dashboard/bookings",
  RESERVATION: "/dashboard/reservation",
  CUSTOMERS: "/dashboard/customers",
  PAYMENTS: "/dashboard/payments",
  PAYMENT_LOGS: "/dashboard/payment-logs",
  REFUND_REQUESTS: "/dashboard/refund-requests",
  AUDIT_LOGS: "/dashboard/audit-logs",
  GALLERY: "/dashboard/gallery",
  USERS: "/dashboard/users",
  BLOGS: "/dashboard/blogs",
  SETTINGS: "/dashboard/settings",
} as const;


export const CUSTOMER_TYPE = {
  REGULAR: "regular",
  VIP: "vip",
  BLACKLIST: "blacklist",
} as const;


export const BLOG_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

/**
 * Nationality codes and labels
 */
export const NATIONALITY = {
  VIETNAM: "Vietnam",
  USA: "USA",
  JAPAN: "Japan",
  SOUTH_KOREA: "South Korea",
  CHINA: "China",
  THAILAND: "Thailand",
  SINGAPORE: "Singapore",
  MALAYSIA: "Malaysia",
  AUSTRALIA: "Australia",
  UK: "UK",
  FRANCE: "France",
  GERMANY: "Germany",
  CANADA: "Canada",
  TAIWAN: "Taiwan",
  HONG_KONG: "Hong Kong",
  INDIA: "India",
  INDONESIA: "Indonesia",
  PHILIPPINES: "Philippines",
  OTHER: "Other",
} as const;

/**
 * Nationality labels mapping
 */
export const nationalityLabels: Record<
  (typeof NATIONALITY)[keyof typeof NATIONALITY],
  string
> = {
  [NATIONALITY.VIETNAM]: "Việt Nam",
  [NATIONALITY.USA]: "Hoa Kỳ",
  [NATIONALITY.JAPAN]: "Nhật Bản",
  [NATIONALITY.SOUTH_KOREA]: "Hàn Quốc",
  [NATIONALITY.CHINA]: "Trung Quốc",
  [NATIONALITY.THAILAND]: "Thái Lan",
  [NATIONALITY.SINGAPORE]: "Singapore",
  [NATIONALITY.MALAYSIA]: "Malaysia",
  [NATIONALITY.AUSTRALIA]: "Úc",
  [NATIONALITY.UK]: "Anh",
  [NATIONALITY.FRANCE]: "Pháp",
  [NATIONALITY.GERMANY]: "Đức",
  [NATIONALITY.CANADA]: "Canada",
  [NATIONALITY.TAIWAN]: "Đài Loan",
  [NATIONALITY.HONG_KONG]: "Hồng Kông",
  [NATIONALITY.INDIA]: "Ấn Độ",
  [NATIONALITY.INDONESIA]: "Indonesia",
  [NATIONALITY.PHILIPPINES]: "Philippines",
  [NATIONALITY.OTHER]: "Khác",
};


export const BANK_ACCOUNT = {
  ACC: "01801807326",
  BANK: "TPBank",
  ACCOUNT_NAME: "CÔNG TY CỔ PHẦN KHÁCH SẠN YQ"
} as const

/**
 * Room category codes for classification
 */
export const ROOM_CATEGORY_CODE = {
  URBAN_COMPACT_QUEEN: "URBAN_COMPACT_QUEEN",
  URBAN_COMPACT_TWIN: "URBAN_COMPACT_TWIN",
  URBAN_BALCONY_QUEEN: "URBAN_BALCONY_QUEEN",
  DELUXE_BALCONY_QUEEN: "DELUXE_BALCONY_QUEEN",
  PREMIUM_CITY_VIEW: "PREMIUM_CITY_VIEW",
  EXEC_BALCONY_SUITE: "EXEC_BALCONY_SUITE",
  MAINTENANCE: "MAINTENANCE"
} as const;

/**
 * Room category code labels mapping
 */
export const roomCategoryCodeLabels: Record<
  (typeof ROOM_CATEGORY_CODE)[keyof typeof ROOM_CATEGORY_CODE],
  string
> = {
  [ROOM_CATEGORY_CODE.URBAN_COMPACT_QUEEN]: "Urban Compact Queen",
  [ROOM_CATEGORY_CODE.URBAN_COMPACT_TWIN]: "Urban Compact Twin Single",
  [ROOM_CATEGORY_CODE.URBAN_BALCONY_QUEEN]: "Urban Balcony Queen",
  [ROOM_CATEGORY_CODE.DELUXE_BALCONY_QUEEN]: "Deluxe Balcony Queen",
  [ROOM_CATEGORY_CODE.PREMIUM_CITY_VIEW]: "Premium City View Queen",
  [ROOM_CATEGORY_CODE.EXEC_BALCONY_SUITE]: "Executive Balcony Suite",
  [ROOM_CATEGORY_CODE.MAINTENANCE]: "Maintenance"
};



export const ROLE_REDIRECT: Record<string, string> = {
    [USER_ROLE.ADMIN]: SIDEBAR_URLS.DASHBOARD,
    [USER_ROLE.MANAGER]: SIDEBAR_URLS.DASHBOARD,
    [USER_ROLE.STAFF]: SIDEBAR_URLS.RESERVATION,
  };
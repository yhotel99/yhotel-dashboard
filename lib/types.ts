// Common types for the application
import type { RoomMapStatus } from "@/lib/constants";

// ============================================================================
// User & Profile Types
// ============================================================================

// Profile type matching database schema (profiles table)
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// User role type
export type UserRole = "admin" | "manager" | "staff";

// User status type
export type UserStatus = "active" | "inactive" | "suspended";

// ============================================================================
// Room Types
// ============================================================================

// Room type enum
export type RoomType = "standard" | "deluxe" | "superior" | "family";

// Room status type
export type RoomStatus = "available" | "maintenance" | "not_clean" | "clean";

// Room type matching database schema (rooms table)
export type Room = {
  id: string;
  name: string;
  description: string | null;
  room_type: RoomType;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  status: RoomStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  thumbnail?: ImageValue;
};

// Room input type for create/update
export type RoomInput = {
  name: string;
  description?: string | null;
  room_type: RoomType;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  status: RoomStatus;
};

// ============================================================================
// Image Types
// ============================================================================

// Image value type (id and url)
export type ImageValue = {
  id: string;
  url: string;
};

// Gallery image type
export type GalleryImage = {
  id: string;
  url: string;
};

// Extended room type with images
export type RoomWithImages = Room & {
  thumbnail?: ImageValue;
  images?: ImageValue[];
};

// ============================================================================
// Room Map Types
// ============================================================================

// Type từ room_status_view (database view)
export type RoomStatusViewData = {
  id: string;
  name: string;
  description: string | null;
  room_type: RoomType;
  price_per_night: string;
  max_guests: number;
  amenities: string[];
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  technical_status: string;
  check_in: string | null;
  check_out: string | null;
  booking_status: string | null;
  current_status: string;
  booking_id: string | null;
};

// Room with booking information for map view
export type RoomWithBooking = Room & {
  currentBooking: {
    id: string;
    check_in: string;
    check_out: string;
    status: string;
  } | null;
  mapStatus: RoomMapStatus;
  isClean: boolean;
};

// ============================================================================
// Storage & Upload Types
// ============================================================================

// Upload progress type
export type UploadProgress = {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

// Upload result type
export type UploadResult = {
  url: string;
  path: string;
};

// Storage options type
export type UseStorageOptions = {
  bucket?: string;
  folder?: string;
  onProgress?: (progress: UploadProgress[]) => void;
};

// ============================================================================
// Booking Types
// ============================================================================

// Booking status type
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

// Booking record matching database schema (bookings table)
export type BookingRecord = {
  id: string;
  customer_id: string | null;
  room_id: string | null;
  check_in: string;
  check_out: string;
  number_of_nights: number;
  total_guests: number;
  status: BookingStatus;
  notes: string | null;
  total_amount: number;
  advance_payment: number;
  actual_check_in: string | null;
  actual_check_out: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  booking_code: string;
  // Relations (from join queries)
  customers?: {
    full_name: string;
    phone: string | null;
  } | null;
  rooms?: {
    name: string;
  } | null;
};

// Booking input type for create/update operations
export type BookingInput = {
  customer_id?: string | null;
  room_id?: string | null;
  check_in: string;
  check_out: string;
  number_of_nights?: number;
  total_guests?: number;
  status?: BookingStatus;
  notes?: string | null;
  total_amount: number;
  advance_payment?: number;
  actual_check_in?: string | null;
  actual_check_out?: string | null;
};

// Partial booking input for simple updates (only total_guests and notes)
export type UpdateBookingInput = {
  total_guests?: number;
  notes?: string | null;
};

// Transfer booking input (for changing room, dates, and payments)
export type TransferBookingInput = {
  room_id?: string | null;
  check_in?: string;
  check_out?: string;
  number_of_nights?: number;
  total_amount?: number;
  advance_payment?: number;
};

// ============================================================================
// Payment Types
// ============================================================================

// Payment method enum
export type PaymentMethod = "bank_transfer" | "pay_at_hotel";

// Payment type enum
export type PaymentType = "room_charge" | "advance_payment" | "extra_service";

// Payment status enum
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

// Payment record matching database schema (payments table)
export type Payment = {
  id: string;
  booking_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_at: string | null;
  verified_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

// Payment input type for create/update operations
export type PaymentInput = {
  booking_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  paid_at?: string | null;
  verified_at?: string | null;
  refunded_at?: string | null;
};

// Payment with booking and related data (from join queries)
export type PaymentWithBooking = Payment & {
  bookings?: {
    customers?: {
      full_name: string;
      phone: string | null;
    } | null;
    rooms?: {
      name: string;
    } | null;
  } | null;
};

// Type for payment_search_row from database function
export type PaymentSearchRow = {
  id: string;
  booking_id: string;
  amount: number | string;
  payment_type: string;
  payment_method: string;
  payment_status: string;
  paid_at: string | null;
  verified_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  customers: {
    full_name: string | null;
    phone: string | null;
  } | null;
  rooms: {
    name: string | null;
  } | null;
};

// ============================================================================
// Customer Types
// ============================================================================

// Customer type enum
export type CustomerType = "regular" | "vip" | "blacklist";

// Customer type matching database schema (customers table)
export type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  id_card: string | null;
  customer_type: CustomerType;
  date_of_birth: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Computed fields from bookings
  total_bookings?: number;
  total_spent?: number;
};

// Customer input type for create/update
export type CustomerInput = {
  full_name: string;
  email: string;
  phone?: string | null;
  nationality?: string | null;
  id_card?: string | null;
  customer_type?: CustomerType;
  date_of_birth?: string | null;
  source?: string | null;
};

// ============================================================================
// Pagination Types
// ============================================================================

// ============================================================================
// Refund Request Types
// ============================================================================

// Refund request status type
export type RefundRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded";

// Refund request type matching database schema (refund_requests table)
export type RefundRequest = {
  id: string;
  booking_id: string;
  payment_id: string | null;
  customer_id: string | null;
  request_by: string;
  approved_by: string | null;
  refunded_by: string | null;
  reason: string | null;
  note: string | null;
  amount: number;
  status: RefundRequestStatus;
  created_at: string;
  updated_at: string;
};

// Refund request input type for create operations
export type RefundRequestInput = {
  booking_id: string;
  payment_id: string | null;
  customer_id: string | null;
  reason?: string | null;
  note?: string | null;
  amount: number;
};

// ============================================================================
// Pagination Types
// ============================================================================

// Pagination metadata type
export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PreviewItem = {
  id: string;
  file: File;
  url: string;
};

export type RefundRequestWithRelations = RefundRequest & {
  bookings?: {
    id: string;
    customers?: {
      full_name: string;
      phone: string | null;
    } | null;
    rooms?: {
      name: string;
    } | null;
  } | null;
  request_by_profile?: {
    full_name: string;
  } | null;
  approved_by_profile?: {
    full_name: string;
  } | null;
  refunded_by_profile?: {
    full_name: string;
  } | null;
};

// ============================================================================
// Blog Types
// ============================================================================

// Blog status type
export type BlogStatus = "draft" | "published" | "archived";

// Blog type matching database schema (blogs table)
export type Blog = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: BlogStatus;
  featured_image: string | null;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations (from join queries)
  author?: {
    full_name: string;
    email: string;
  } | null;
};

// Blog input type for create/update
export type BlogInput = {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  status: BlogStatus;
  featured_image?: string | null;
  published_at?: string | null;
};

export type BlogsResponse = {
  data: Blog[];
  pagination: PaginationMeta;
};

export type BookingsResponse = {
  data: BookingRecord[];
  pagination: PaginationMeta;
};

export type CustomersResponse = {
  data: Customer[];
  pagination: PaginationMeta;
};

export type GalleryImagesResponse = {
  data: GalleryImage[];
  pagination: PaginationMeta;
};

export type PaymentsResponse = {
  data: PaymentWithBooking[];
  pagination: PaginationMeta;
};

// ============================================================================
// Payment Log Types
// ============================================================================

// Payment log type matching database schema (payment_logs table)
export type PaymentLog = {
  id: string;
  booking_id: string | null;
  booking_code: string | null;
  transaction_id: string | null;
  amount: number | null;
  content: string | null;
  bank_code: string | null;
  status: string | null;
  raw_payload: Record<string, unknown> | null;
  processed_at: string;
  created_at: string;
};

// Payment log with booking and related data (from join queries)
export type PaymentLogWithBooking = PaymentLog & {
  bookings?: {
    customers?: {
      full_name: string;
      phone: string | null;
    } | null;
    rooms?: {
      name: string;
    } | null;
  } | null;
};

export type PaymentLogsResponse = {
  data: PaymentLogWithBooking[];
  pagination: PaginationMeta;
};

export type ProfilesResponse = {
  data: Profile[];
  pagination: PaginationMeta;
};

export type RefundRequestsResponse = {
  data: RefundRequestWithRelations[];
  pagination: PaginationMeta;
};

export type ReservationsResponse = {
  data: RoomWithBooking[];
};

export type RoomsResponse = {
  data: Room[];
  pagination: PaginationMeta;
};

export type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
// Common types for the application
import type { RoomMapStatus } from "./constants";

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

// Room type matching database schema (rooms table)
export type Room = {
  id: string;
  name: string;
  description: string | null;
  room_type: "standard" | "deluxe" | "superior" | "family";
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  status: "available" | "maintenance" | "not_clean" | "clean";
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  thumbnail?: ImageValue;
};

// Room input type for create/update
export type RoomInput = {
  name: string;
  description?: string | null;
  room_type: "standard" | "deluxe" | "superior" | "family";
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  status: "available" | "maintenance" | "not_clean" | "clean";
};

// Room type enum
export type RoomType = "standard" | "deluxe" | "superior" | "family";

// Room status type
export type RoomStatus = "available" | "maintenance" | "not_clean" | "clean";

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
  room_type: "standard" | "deluxe" | "superior" | "family";
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
  | "awaiting_payment"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled"
  | "no_show"
  | "refunded";

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
  // Relations (from join queries)
  customers?: {
    full_name: string;
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

// ============================================================================
// Customer Types
// ============================================================================

// Customer type matching database schema (customers table)
export type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  id_card: string | null;
  customer_type: "regular" | "vip" | "blacklist";
  date_of_birth: string | null;
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
  customer_type?: "regular" | "vip" | "blacklist";
  date_of_birth?: string | null;
};

// Customer type enum
export type CustomerType = "regular" | "vip" | "blacklist";

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

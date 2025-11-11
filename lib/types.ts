// Common types for the application

// ============================================================================
// User & Profile Types
// ============================================================================

// Profile type matching database schema (profiles table)
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "admin" | "manager" | "staff";
  status: "active" | "inactive" | "suspended";
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
  status: "available" | "maintenance" | "inactive";
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
  status: "available" | "maintenance" | "inactive";
};

// Room type enum
export type RoomType = "standard" | "deluxe" | "superior" | "family";

// Room status type
export type RoomStatus = "available" | "maintenance" | "inactive";

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

// Booking type
export type Booking = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  status: BookingStatus;
  paymentMethod: string;
  createdAt: string;
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

// Shared booking data and helpers
export type BookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'refunded'

export type Booking = {
  id: string
  bookingCode: string
  customerName: string
  customerPhone: string
  roomNumber: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  totalAmount: number
  status: BookingStatus
  paymentMethod: string
  createdAt: string
}

// NOTE: Keep in sync with main page dataset
export const rawBookingsData: Booking[] = [
  { id: "1", bookingCode: "BK001", customerName: "Nguyễn Văn A", customerPhone: "0901234567", roomNumber: "101", checkIn: "2024-01-15", checkOut: "2024-01-17", nights: 2, guests: 2, totalAmount: 1000000, status: "confirmed", paymentMethod: "Credit Card", createdAt: "2024-01-10" },
  { id: "2", bookingCode: "BK002", customerName: "Trần Thị B", customerPhone: "0902345678", roomNumber: "201", checkIn: "2024-01-16", checkOut: "2024-01-18", nights: 2, guests: 4, totalAmount: 2400000, status: "checked_in", paymentMethod: "Cash", createdAt: "2024-01-11" },
  { id: "3", bookingCode: "BK003", customerName: "Lê Văn C", customerPhone: "0903456789", roomNumber: "302", checkIn: "2024-01-20", checkOut: "2024-01-22", nights: 2, guests: 4, totalAmount: 2400000, status: "pending", paymentMethod: "Bank Transfer", createdAt: "2024-01-12" },
  { id: "4", bookingCode: "BK004", customerName: "Phạm Thị D", customerPhone: "0904567890", roomNumber: "402", checkIn: "2024-01-14", checkOut: "2024-01-15", nights: 1, guests: 2, totalAmount: 800000, status: "checked_out", paymentMethod: "Credit Card", createdAt: "2024-01-08" },
  { id: "5", bookingCode: "BK005", customerName: "Hoàng Văn E", customerPhone: "0905678901", roomNumber: "501", checkIn: "2024-01-18", checkOut: "2024-01-21", nights: 3, guests: 4, totalAmount: 3600000, status: "confirmed", paymentMethod: "Credit Card", createdAt: "2024-01-13" },
  { id: "6", bookingCode: "BK006", customerName: "Vũ Thị F", customerPhone: "0906789012", roomNumber: "601", checkIn: "2024-01-19", checkOut: "2024-01-20", nights: 1, guests: 2, totalAmount: 800000, status: "cancelled", paymentMethod: "Credit Card", createdAt: "2024-01-09" },
  { id: "7", bookingCode: "BK007", customerName: "Đặng Văn G", customerPhone: "0907890123", roomNumber: "102", checkIn: "2024-01-22", checkOut: "2024-01-25", nights: 3, guests: 2, totalAmount: 1500000, status: "confirmed", paymentMethod: "Cash", createdAt: "2024-01-14" },
  { id: "8", bookingCode: "BK008", customerName: "Bùi Thị H", customerPhone: "0908901234", roomNumber: "202", checkIn: "2024-01-17", checkOut: "2024-01-19", nights: 2, guests: 2, totalAmount: 1000000, status: "checked_in", paymentMethod: "Credit Card", createdAt: "2024-01-12" },
  { id: "9", bookingCode: "BK009", customerName: "Đỗ Văn I", customerPhone: "0909012345", roomNumber: "301", checkIn: "2024-01-23", checkOut: "2024-01-26", nights: 3, guests: 2, totalAmount: 2400000, status: "pending", paymentMethod: "Bank Transfer", createdAt: "2024-01-15" },
  { id: "10", bookingCode: "BK010", customerName: "Ngô Thị K", customerPhone: "0900123456", roomNumber: "401", checkIn: "2024-01-13", checkOut: "2024-01-14", nights: 1, guests: 2, totalAmount: 500000, status: "checked_out", paymentMethod: "Cash", createdAt: "2024-01-07" },
  { id: "11", bookingCode: "BK011", customerName: "Dương Văn L", customerPhone: "0911234567", roomNumber: "502", checkIn: "2024-01-24", checkOut: "2024-01-27", nights: 3, guests: 4, totalAmount: 3600000, status: "confirmed", paymentMethod: "Credit Card", createdAt: "2024-01-16" },
  { id: "12", bookingCode: "BK012", customerName: "Phan Thị M", customerPhone: "0912345678", roomNumber: "602", checkIn: "2024-01-21", checkOut: "2024-01-23", nights: 2, guests: 4, totalAmount: 2400000, status: "pending", paymentMethod: "Bank Transfer", createdAt: "2024-01-17" },
  { id: "13", bookingCode: "BK013", customerName: "Võ Văn N", customerPhone: "0913456789", roomNumber: "702", checkIn: "2024-01-25", checkOut: "2024-01-28", nights: 3, guests: 2, totalAmount: 2400000, status: "confirmed", paymentMethod: "Credit Card", createdAt: "2024-01-18" },
  { id: "14", bookingCode: "BK014", customerName: "Lý Thị O", customerPhone: "0914567890", roomNumber: "801", checkIn: "2024-01-26", checkOut: "2024-01-29", nights: 3, guests: 4, totalAmount: 3600000, status: "checked_in", paymentMethod: "Cash", createdAt: "2024-01-19" },
  { id: "15", bookingCode: "BK015", customerName: "Cao Văn P", customerPhone: "0915678901", roomNumber: "103", checkIn: "2024-01-27", checkOut: "2024-01-30", nights: 3, guests: 2, totalAmount: 1500000, status: "pending", paymentMethod: "Credit Card", createdAt: "2024-01-20" },
  { id: "16", bookingCode: "BK016", customerName: "Tăng Thị Q", customerPhone: "0916789012", roomNumber: "203", checkIn: "2024-01-28", checkOut: "2024-01-31", nights: 3, guests: 2, totalAmount: 1500000, status: "confirmed", paymentMethod: "Bank Transfer", createdAt: "2024-01-21" },
  { id: "17", bookingCode: "BK017", customerName: "Trịnh Văn R", customerPhone: "0917890123", roomNumber: "303", checkIn: "2024-01-29", checkOut: "2024-02-01", nights: 3, guests: 4, totalAmount: 3600000, status: "checked_out", paymentMethod: "Credit Card", createdAt: "2024-01-22" },
  { id: "18", bookingCode: "BK018", customerName: "Lương Thị S", customerPhone: "0918901234", roomNumber: "403", checkIn: "2024-01-30", checkOut: "2024-02-02", nights: 3, guests: 2, totalAmount: 2400000, status: "cancelled", paymentMethod: "Credit Card", createdAt: "2024-01-23" },
  { id: "19", bookingCode: "BK019", customerName: "Mai Văn T", customerPhone: "0919012345", roomNumber: "503", checkIn: "2024-01-31", checkOut: "2024-02-03", nights: 3, guests: 4, totalAmount: 3600000, status: "confirmed", paymentMethod: "Cash", createdAt: "2024-01-24" },
  { id: "20", bookingCode: "BK020", customerName: "Hồ Thị U", customerPhone: "0920123456", roomNumber: "603", checkIn: "2024-02-01", checkOut: "2024-02-04", nights: 3, guests: 2, totalAmount: 2400000, status: "pending", paymentMethod: "Credit Card", createdAt: "2024-01-25" },
]

export function getBookingsByCustomerPhone(phone: string): Booking[] {
  return rawBookingsData.filter((b) => b.customerPhone === phone)
}

export function getBookingById(id: string) {
  return rawBookingsData.find((b) => b.id === id)
}

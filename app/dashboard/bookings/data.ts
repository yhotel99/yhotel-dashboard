// Booking data type
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
  status: "pending" | "confirmed" | "checked-in" | "checked-out" | "cancelled"
  paymentMethod: string
  createdAt: string
}

// Sample data
export const bookingsData: Booking[] = [
  {
    id: "1",
    bookingCode: "BK001",
    customerName: "Nguyễn Văn A",
    customerPhone: "0901234567",
    roomNumber: "101",
    checkIn: "2024-01-15",
    checkOut: "2024-01-17",
    nights: 2,
    guests: 2,
    totalAmount: 1000000,
    status: "confirmed",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    bookingCode: "BK002",
    customerName: "Trần Thị B",
    customerPhone: "0902345678",
    roomNumber: "201",
    checkIn: "2024-01-16",
    checkOut: "2024-01-18",
    nights: 2,
    guests: 4,
    totalAmount: 2400000,
    status: "checked-in",
    paymentMethod: "Cash",
    createdAt: "2024-01-11",
  },
  // ... copy all objects from page.tsx bookingsData here ...
]

// Helper
export function getBookingById(id: string): Booking | undefined {
  return bookingsData.find(b => b.id === id)
}

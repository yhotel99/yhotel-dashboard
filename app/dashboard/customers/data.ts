// User data type
export type User = {
  id: string
  name: string
  email: string
  phone: string
  role: "admin" | "manager" | "staff" | "receptionist"
  status: "active" | "inactive" | "suspended"
  createdAt: string
  lastLogin: string
}

// Sample data
export const usersData: User[] = [
  {
    id: "1",
    name: "Nguyễn Văn Admin",
    email: "admin@yhotel.com",
    phone: "0901234567",
    role: "admin",
    status: "active",
    createdAt: "2024-01-01",
    lastLogin: "2024-01-25",
  },
  // ...copy toàn bộ dữ liệu mẫu users từ page.tsx vào đây...
]

export function getUserById(id: string): User | undefined {
  return usersData.find((user) => user.id === id)
}

// Customers module
export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  totalBookings: number
  totalSpent: number
  createdAt: string
  status: "active" | "banned"
}

export const customersData: Customer[] = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    phone: "0901234567",
    email: "a@example.com",
    totalBookings: 5,
    totalSpent: 6000000,
    createdAt: "2023-10-10",
    status: "active",
  },
  {
    id: "2",
    name: "Trần Thị B",
    phone: "0902345678",
    email: "b@example.com",
    totalBookings: 2,
    totalSpent: 2000000,
    createdAt: "2023-11-15",
    status: "active",
  },
  {
    id: "3",
    name: "Phạm Văn C",
    phone: "0903456789",
    email: "c@example.com",
    totalBookings: 7,
    totalSpent: 9000000,
    createdAt: "2023-12-01",
    status: "banned",
  },
  {
    id: "4",
    name: "Lê Thị D",
    phone: "0904567890",
    email: "d@example.com",
    totalBookings: 1,
    totalSpent: 1000000,
    createdAt: "2024-01-05",
    status: "active",
  },
]

export function getCustomerById(id: string): Customer | undefined {
  return customersData.find((c) => c.id === id)
}

export function getCustomerByPhone(phone: string): Customer | undefined {
  return customersData.find((c) => c.phone === phone)
}

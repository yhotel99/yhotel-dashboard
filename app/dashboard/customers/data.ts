import type { Customer } from "@/lib/types";

// Re-export types for backward compatibility
export type { Customer } from "@/lib/types";

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
];

export function getCustomerById(id: string): Customer | undefined {
  return customersData.find((c) => c.id === id);
}

export function getCustomerByPhone(phone: string): Customer | undefined {
  return customersData.find((c) => c.phone === phone);
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// lib/utils/avatar.ts

// 🎨 Hàm tạo màu gradient ổn định dựa vào user.id
export function generateGradient(id: string) {
  const colors = [
    ["#06b6d4", "#3b82f6"], // cyan → blue
    ["#8b5cf6", "#ec4899"], // violet → pink
    ["#14b8a6", "#22c55e"], // teal → green
    ["#f59e0b", "#ef4444"], // amber → red
    ["#6366f1", "#0ea5e9"], // indigo → sky
  ]
  const index = id ? id.charCodeAt(0) % colors.length : 0
  const [from, to] = colors[index]
  return `linear-gradient(135deg, ${from}, ${to})`
}

// 🧠 Hàm lấy chữ cái viết tắt của tên
export function getInitials(name?: string | null) {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0][0]?.toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

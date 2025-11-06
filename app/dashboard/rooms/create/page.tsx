"use client"

import { useRouter } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { RoomForm } from "@/components/room-form"

export default function CreateRoomPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 cursor-pointer"
        >
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Tạo phòng mới</h1>
          <p className="text-muted-foreground text-sm">
            Thêm phòng mới vào hệ thống quản lý khách sạn
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <RoomForm mode="create" />
      </div>
    </div>
  )
}


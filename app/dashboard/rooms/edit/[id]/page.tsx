"use client"

import { useRouter, useParams } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { RoomForm, type RoomFormValues } from "@/components/room-form"
import { getRoomById } from "../../data"

export default function EditRoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string
  const [room, setRoom] = useState<ReturnType<typeof getRoomById>>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchRoom = async () => {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      const roomData = getRoomById(roomId)
      setRoom(roomData || undefined)
      setLoading(false)
    }

    if (roomId) {
      fetchRoom()
    }
  }, [roomId])

  const defaultValues: Partial<RoomFormValues> | undefined = room
    ? {
        number: room.number,
        type: room.type,
        status: room.status,
        price: room.price.toString(),
        floor: room.floor.toString(),
        capacity: room.capacity.toString(),
        amenities: room.amenities,
      }
    : undefined

  if (loading) {
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
            <h1 className="text-2xl font-bold">Chỉnh sửa phòng</h1>
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!room) {
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
            <h1 className="text-2xl font-bold">Không tìm thấy phòng</h1>
            <p className="text-muted-foreground text-sm">
              Phòng không tồn tại hoặc đã bị xóa
            </p>
          </div>
        </div>
      </div>
    )
  }

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
          <h1 className="text-2xl font-bold">Chỉnh sửa phòng</h1>
          <p className="text-muted-foreground text-sm">
            Cập nhật thông tin phòng {room.number}
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <RoomForm
          mode="edit"
          roomId={roomId}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  )
}


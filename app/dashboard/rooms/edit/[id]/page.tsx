"use client";

import { useRouter, useParams } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { RoomForm, type RoomFormValues } from "@/components/room-form";
import { useRoomById } from "@/hooks/use-rooms";

export default function EditRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const { data: room, isLoading } = useRoomById(roomId);

  const defaultValues: Partial<RoomFormValues> | undefined = room
    ? {
        name: room.name,
        description: room.description || "",
        room_type: room.room_type,
        status: room.status,
        price_per_night: room.price_per_night.toString(),
        max_guests: room.max_guests.toString(),
        amenities: room.amenities,
        thumbnail: room.thumbnail,
        images: room.images,
      }
    : undefined;

  if (isLoading) {
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
    );
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
    );
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
            Cập nhật thông tin phòng {room.name}
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <RoomForm mode="edit" roomId={roomId} defaultValues={defaultValues} />
      </div>
    </div>
  );
}

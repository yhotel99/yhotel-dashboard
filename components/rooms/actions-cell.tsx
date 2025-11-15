import { useRouter } from "next/navigation";
import { IconDotsVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Room } from "@/hooks/use-rooms";

export function RoomActionsCell({
  room,
  onDelete,
  onChangeStatus,
}: {
  room: Room;
  onDelete: (room: Room) => void;
  onChangeStatus?: (room: Room) => void;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          size="icon"
        >
          <IconDotsVertical />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => router.push(`/dashboard/rooms/edit/${room.id}`)}
        >
          Chỉnh sửa
        </DropdownMenuItem>
        {onChangeStatus && (
          <DropdownMenuItem onClick={() => onChangeStatus(room)}>
            Thay đổi trạng thái
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(room)}>
          Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

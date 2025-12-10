import { useRouter } from "next/navigation";
import {
  IconDotsVertical,
  IconEdit,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Room } from "@/lib/types";

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
          <IconEdit className="mr-2 size-4" />
          Chỉnh sửa
        </DropdownMenuItem>
        {onChangeStatus && (
          <DropdownMenuItem onClick={() => onChangeStatus(room)}>
            <IconRefresh className="mr-2 size-4" />
            Thay đổi trạng thái
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(room)}>
          <IconTrash className="mr-2 size-4" />
          Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

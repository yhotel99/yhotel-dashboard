import { ColumnDef } from "@tanstack/react-table";
import { ROOM_STATUS, roomStatusLabels, roomTypeLabels } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThumbnailCell } from "./thumbnail-cell";
import { AmenitiesCell } from "./amenities-cell";
import { RoomActionsCell } from "./actions-cell";
import { formatCurrency } from "@/lib/functions";
import { Room } from "@/lib/types";
import { cn } from "@/lib/utils";

export function createColumns(
  onDelete: (room: Room) => void,
  onChangeStatus?: (roomId: string, newStatus: Room["status"]) => void
): ColumnDef<Room>[] {
  return [
    {
      accessorKey: "thumbnail",
      header: "Ảnh",
      cell: ({ row }) => (
        <ThumbnailCell thumbnailUrl={row.original.thumbnail?.url} />
      ),
      size: 70,
      minSize: 50,
    },
    {
      accessorKey: "name",
      header: "Tên phòng",
      size: 100,
      minSize: 80,
    },
    {
      accessorKey: "room_type",
      header: "Loại phòng",
      cell: ({ row }) => roomTypeLabels[row.original.room_type],
      size: 100,
      minSize: 80,
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => (
        <RoomStatusCell
          roomId={row.original.id}
          status={row.original.status}
          onChangeStatus={onChangeStatus}
        />
      ),
      size: 100,
      minSize: 80,
    },
    {
      accessorKey: "price_per_night",
      header: "Giá mỗi đêm",
      cell: ({ row }) => formatCurrency(row.original.price_per_night),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "max_guests",
      header: "Số khách tối đa",
      cell: ({ row }) => `${row.original.max_guests} người`,
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "amenities",
      header: "Tiện ích",
      cell: ({ row }) => {
        const amenities = Array.isArray(row.original.amenities)
          ? row.original.amenities
          : [];
        return <AmenitiesCell amenities={amenities} />;
      },
      size: 140,
      minSize: 120,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RoomActionsCell room={row.original} onDelete={onDelete} />
      ),
      size: 40,
      minSize: 40,
      maxSize: 50,
    },
  ];
}

interface RoomStatusCellProps {
  roomId: string;
  status: Room["status"];
  onChangeStatus?: (roomId: string, newStatus: Room["status"]) => void;
}

function RoomStatusCell({
  roomId,
  status,
  onChangeStatus,
}: RoomStatusCellProps) {
  const statusClasses: Record<Room["status"], string> = {
    [ROOM_STATUS.AVAILABLE]:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300",
    [ROOM_STATUS.MAINTENANCE]:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300",
    [ROOM_STATUS.NOT_CLEAN]:
      "border-red-300 bg-red-50 text-red-700 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-300",
    [ROOM_STATUS.CLEAN]:
      "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/60 dark:bg-sky-500/10 dark:text-sky-300",
  };

  const handleChange = (value: string) => {
    if (!onChangeStatus) return;
    const newStatus = value as Room["status"];
    if (newStatus === status) return;
    onChangeStatus(roomId, newStatus);
  };

  return (
    <Select defaultValue={status} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          "xl:w-[120px] w-full border px-2 py-1 text-xs font-medium",
          statusClasses[status]
        )}
      >
        <SelectValue placeholder="Chọn trạng thái" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          value={ROOM_STATUS.AVAILABLE}
          className="text-emerald-700 dark:text-emerald-300"
        >
          {roomStatusLabels[ROOM_STATUS.AVAILABLE]}
        </SelectItem>
        <SelectItem
          value={ROOM_STATUS.MAINTENANCE}
          className="text-amber-700 dark:text-amber-300"
        >
          {roomStatusLabels[ROOM_STATUS.MAINTENANCE]}
        </SelectItem>
        <SelectItem
          value={ROOM_STATUS.NOT_CLEAN}
          className="text-red-700 dark:text-red-300"
        >
          {roomStatusLabels[ROOM_STATUS.NOT_CLEAN]}
        </SelectItem>
        <SelectItem
          value={ROOM_STATUS.CLEAN}
          className="text-sky-700 dark:text-sky-300"
        >
          {roomStatusLabels[ROOM_STATUS.CLEAN]}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

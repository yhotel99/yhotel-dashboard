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

// Column definitions constants
export const ROOMS_COLUMNS = {
  IMAGE: { accessorKey: "Ảnh", header: "Ảnh" },
  NAME: { accessorKey: "Tên phòng", header: "Tên phòng" },
  ROOM_NUMBER: { accessorKey: "Số phòng", header: "Số phòng" },
  FLOOR_NUMBER: { accessorKey: "Số tầng", header: "Số tầng" },
  ROOM_TYPE: { accessorKey: "Loại phòng", header: "Loại phòng" },
  STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  PRICE_PER_NIGHT: { accessorKey: "Giá mỗi đêm", header: "Giá mỗi đêm" },
  MAX_GUESTS: { accessorKey: "Số khách tối đa", header: "Số khách tối đa" },
  AMENITIES: { accessorKey: "Tiện ích", header: "Tiện ích" },
  ACTIONS: { accessorKey: "Hành động", header: "Hành động" },
} as const;

export function createColumns(
  onDelete: (room: Room) => void,
  onChangeStatus?: (roomId: string, newStatus: Room["status"]) => void,
  onViewDetail?: (room: Room) => void
): ColumnDef<Room>[] {
  return [
    {
      accessorKey: ROOMS_COLUMNS.IMAGE.accessorKey,
      header: ROOMS_COLUMNS.IMAGE.header,
      cell: ({ row }) => (
        <ThumbnailCell thumbnailUrl={row.original.thumbnail?.url} />
      ),
      size: 50,
      minSize: 50,
      maxSize: 70,
    },
    {
      accessorKey: ROOMS_COLUMNS.NAME.accessorKey,
      header: ROOMS_COLUMNS.NAME.header,
      cell: ({ row }) => row.original.name,
      size: 120,
      minSize: 80,
      maxSize: 120,
    },
    {
      accessorKey: ROOMS_COLUMNS.ROOM_NUMBER.accessorKey,
      header: ROOMS_COLUMNS.ROOM_NUMBER.header,
      cell: ({ row }) => row.original.room_number || "-",
      size: 80,
      minSize: 60,
      maxSize: 100,
    },
    {
      accessorKey: ROOMS_COLUMNS.FLOOR_NUMBER.accessorKey,
      header: ROOMS_COLUMNS.FLOOR_NUMBER.header,
      cell: ({ row }) => row.original.floor_number ? `Tầng ${row.original.floor_number}` : "-",
      size: 70,
      minSize: 60,
      maxSize: 90,
    },
    {
      accessorKey: ROOMS_COLUMNS.ROOM_TYPE.accessorKey,
      header: ROOMS_COLUMNS.ROOM_TYPE.header,
      cell: ({ row }) => roomTypeLabels[row.original.room_type],
      size: 70,
      minSize: 60,
      maxSize: 100,
    },
    {
      accessorKey: ROOMS_COLUMNS.STATUS.accessorKey,
      header: ROOMS_COLUMNS.STATUS.header,
      cell: ({ row }) => (
        <RoomStatusCell
          roomId={row.original.id}
          status={row.original.status}
          onChangeStatus={onChangeStatus}
        />
      ),
      size: 90,
      minSize: 80,
      maxSize: 100,
    },
    {
      accessorKey: ROOMS_COLUMNS.PRICE_PER_NIGHT.accessorKey,
      header: ROOMS_COLUMNS.PRICE_PER_NIGHT.header,
      cell: ({ row }) => formatCurrency(row.original.price_per_night),
      size: 80,
      minSize: 80,
      maxSize: 100,
    },
    {
      accessorKey: ROOMS_COLUMNS.MAX_GUESTS.accessorKey,
      header: ROOMS_COLUMNS.MAX_GUESTS.header,
      cell: ({ row }) => `${row.original.max_guests} người`,
      size: 70,
      minSize: 70,
      maxSize: 100,
    },
    {
      accessorKey: ROOMS_COLUMNS.AMENITIES.accessorKey,
      header: ROOMS_COLUMNS.AMENITIES.header,
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
      accessorKey: ROOMS_COLUMNS.ACTIONS.accessorKey,
      header: ROOMS_COLUMNS.ACTIONS.header,
      cell: ({ row }) => (
        <RoomActionsCell
          room={row.original}
          onDelete={onDelete}
          onViewDetail={onViewDetail}
        />
      ),
      size: 60,
      minSize: 40,
      maxSize: 60,
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

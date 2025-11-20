import { ColumnDef } from "@tanstack/react-table";
import type { Room } from "@/hooks/use-rooms";
import { roomTypeLabels } from "@/lib/constants";
import { StatusBadge } from "./status-badge";
import { ThumbnailCell } from "./thumbnail-cell";
import { AmenitiesCell } from "./amenities-cell";
import { RoomActionsCell } from "./actions-cell";

export function createColumns(
  onDelete: (room: Room) => void,
  onChangeStatus?: (room: Room) => void
): ColumnDef<Room>[] {
  return [
    {
      accessorKey: "thumbnail",
      header: "Ảnh",
      cell: ({ row }) => (
        <ThumbnailCell thumbnailUrl={row.original.thumbnail?.url} />
      ),
    },
    {
      accessorKey: "name",
      header: "Tên phòng",
    },
    {
      accessorKey: "room_type",
      header: "Loại phòng",
      cell: ({ row }) => roomTypeLabels[row.original.room_type],
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "price_per_night",
      header: "Giá mỗi đêm",
      cell: ({ row }) => {
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(row.original.price_per_night);
      },
    },
    {
      accessorKey: "max_guests",
      header: "Số khách tối đa",
      cell: ({ row }) => `${row.original.max_guests} người`,
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
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RoomActionsCell
          room={row.original}
          onDelete={onDelete}
          onChangeStatus={onChangeStatus}
        />
      ),
    },
  ];
}


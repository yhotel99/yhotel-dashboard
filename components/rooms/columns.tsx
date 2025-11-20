import { ColumnDef } from "@tanstack/react-table";
import type { Room } from "@/hooks/use-rooms";
import { roomTypeLabels } from "@/lib/constants";
import { StatusBadge } from "./status-badge";
import { ThumbnailCell } from "./thumbnail-cell";
import { AmenitiesCell } from "./amenities-cell";
import { RoomActionsCell } from "./actions-cell";
import { formatCurrency } from "@/lib/functions";

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
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        <RoomActionsCell
          room={row.original}
          onDelete={onDelete}
          onChangeStatus={onChangeStatus}
        />
      ),
    },
  ];
}

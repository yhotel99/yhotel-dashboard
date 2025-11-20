import { ColumnDef } from "@tanstack/react-table";
import type { Profile } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { RoleBadge } from "./role-badge";
import { UserActionsCell } from "./actions-cell";
import { formatDate } from "@/lib/functions";

export function createColumns(
  onEdit: (profile: Profile) => void
): ColumnDef<Profile>[] {
  return [
    {
      accessorKey: "full_name",
      header: "Tên",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Số điện thoại",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "role",
      header: "Vai trò",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Ngày tạo",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <UserActionsCell
          userName={row.original.full_name}
          profile={row.original}
          onEdit={onEdit}
        />
      ),
    },
  ];
}

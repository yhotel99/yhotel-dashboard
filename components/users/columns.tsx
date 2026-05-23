import { ColumnDef } from "@tanstack/react-table";
import type { Profile } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { RoleBadge } from "./role-badge";
import { UserActionsCell } from "./actions-cell";
import { formatDate } from "@/lib/functions";

export function createColumns(
  onEdit: (profile: Profile) => void,
  branchNameById: Record<string, string> = {}
): ColumnDef<Profile>[] {
  return [
    {
      accessorKey: "Tên",
      header: "Tên",
      cell: ({ row }) => row.original.full_name,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "Số điện thoại",
      header: "Số điện thoại",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "Vai trò",
      header: "Vai trò",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      id: "branch",
      header: "Chi nhánh",
      cell: ({ row }) => {
        const id = row.original.branch_id;
        if (!id) return "—";
        return branchNameById[id] ?? id;
      },
    },
    {
      accessorKey: "Trạng thái",
      header: "Trạng thái",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "Ngày tạo",
      header: "Ngày tạo",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      accessorKey: "Hành động",
      header: "",
      cell: ({ row }) => (
        <UserActionsCell
          userName={row.original.full_name}
          profile={row.original}
          onEdit={onEdit}
        />
      ),
      size: 40,
      minSize: 40,
      maxSize: 50,
    },
  ];
}

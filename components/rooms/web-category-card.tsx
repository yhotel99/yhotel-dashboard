"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconChevronDown,
  IconChevronUp,
  IconLinkOff,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/rooms/status-badge";
import { AssignRoomsDialog } from "@/components/rooms/assign-rooms-dialog";
import {
  CategoryRoomConfirmDialog,
  type CategoryRoomConfirmAction,
} from "@/components/rooms/category-room-confirm-dialog";
import { assignRoomsToCategoryAction } from "@/actions/rooms";
import { formatCurrency } from "@/lib/functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatWebPriceRange,
  getRoomTypeBadgeLabel,
  type CategoryRoomSummary,
  type WebCategoryManagementGroup,
} from "@/lib/room-web-display";
import { cn } from "@/lib/utils";

type WebCategoryCardProps = {
  category: WebCategoryManagementGroup;
  assignableRooms: CategoryRoomSummary[];
  defaultExpanded?: boolean;
  showBranchName?: boolean;
  onUpdated: () => void;
};

function getRoomLabel(room: CategoryRoomSummary): string {
  if (room.room_number) {
    return `P.${room.room_number} — ${room.name}`;
  }
  return room.name;
}

export function WebCategoryCard({
  category,
  assignableRooms,
  defaultExpanded = false,
  showBranchName = false,
  onUpdated,
}: WebCategoryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmAction, setConfirmAction] =
    useState<CategoryRoomConfirmAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAssignIds, setPendingAssignIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priceLabel =
    category.is_empty || category.total_count === 0
      ? "—"
      : formatWebPriceRange(category.min_price, category.max_price);

  const candidates = useMemo(() => {
    const sameBranch = assignableRooms.filter(
      (room) => room.branch_id === category.branch_id
    );
    return sameBranch.filter(
      (room) => room.category_code !== category.category_code
    );
  }, [assignableRooms, category.branch_id, category.category_code]);

  const getRoomLabelById = (roomId: string) => {
    const room =
      category.rooms.find((item) => item.id === roomId) ??
      assignableRooms.find((item) => item.id === roomId);
    return room ? getRoomLabel(room) : roomId;
  };

  const handleAssignRequest = (roomIds: string[]) => {
    setPendingAssignIds(roomIds);
    setAssignOpen(false);
    setConfirmAction({
      type: "assign",
      roomLabels: roomIds.map(getRoomLabelById),
      categoryLabel: category.category_label ?? category.name,
      categoryCode: category.category_code,
    });
    setConfirmOpen(true);
  };

  const handleUnassignRequest = (roomId: string) => {
    setConfirmAction({
      type: "unassign",
      roomLabel: getRoomLabelById(roomId),
      categoryLabel: category.category_label ?? category.name,
      categoryCode: category.category_code,
    });
    setPendingAssignIds([roomId]);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setIsSubmitting(true);
    try {
      if (confirmAction.type === "assign") {
        const result = await assignRoomsToCategoryAction(
          pendingAssignIds,
          category.category_code
        );
        if (!result.ok) {
          toast.error("Gán phòng thất bại", { description: result.message });
          return;
        }
        toast.success(`Đã gán ${result.data.updated} phòng vào hạng này`);
      } else {
        const result = await assignRoomsToCategoryAction(
          pendingAssignIds,
          null
        );
        if (!result.ok) {
          toast.error("Bỏ gán thất bại", { description: result.message });
          return;
        }
        toast.success("Đã bỏ gán hạng phòng");
      }

      setConfirmOpen(false);
      setConfirmAction(null);
      setPendingAssignIds([]);
      onUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative h-44 overflow-hidden rounded-lg bg-muted lg:h-auto lg:min-h-[180px]">
          {category.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.thumbnail_url}
              alt={category.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
              {category.is_empty ? "Chưa có phòng" : "Chưa có ảnh"}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold leading-tight">
                  {category.category_label ?? category.name}
                </p>
                {showBranchName && category.branch_name ? (
                  <Badge variant="secondary" className="text-xs">
                    {category.branch_name}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {category.category_code}
              </p>
            </div>
            {!category.is_empty ? (
              <Badge variant="outline">
                {getRoomTypeBadgeLabel(category.room_type)}
              </Badge>
            ) : (
              <Badge variant="secondary">Trống</Badge>
            )}
          </div>

          {!category.is_empty ? (
            <>
              <p className="text-xl font-bold text-primary">
                {priceLabel}₫
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / đêm
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {category.rooms.length} phòng vật lý · tối đa{" "}
                {category.max_guests} khách
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Hạng đã tạo nhưng chưa có phòng nào — hãy gán phòng bên dưới
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? (
                <IconChevronUp className="size-4" />
              ) : (
                <IconChevronDown className="size-4" />
              )}
              Xem phòng ({category.rooms.length})
            </Button>

            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={isSubmitting}
              onClick={() => setAssignOpen(true)}
            >
              <IconPlus className="size-4" />
              Gán phòng
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t bg-muted/20 px-5 py-4">
            {category.rooms.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Chưa có phòng trong hạng này
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Số phòng</TableHead>
                      <TableHead>Tên phòng</TableHead>
                      <TableHead className="w-[140px]">Giá/đêm</TableHead>
                      <TableHead className="w-[80px]">Tầng</TableHead>
                      <TableHead className="w-[120px]">Trạng thái</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">
                          {room.room_number ? `P.${room.room_number}` : "—"}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate">
                          {room.name}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(room.price_per_night)}
                        </TableCell>
                        <TableCell>
                          {room.floor_number != null
                            ? `T${room.floor_number}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={room.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              asChild
                            >
                              <Link href={`/dashboard/rooms/edit/${room.id}`}>
                                <IconPencil className="size-4" />
                                <span className="sr-only">Sửa phòng</span>
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              disabled={isSubmitting}
                              onClick={() => handleUnassignRequest(room.id)}
                            >
                              <IconLinkOff className="size-4" />
                              <span className="sr-only">Bỏ gán hạng</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AssignRoomsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        categoryLabel={category.category_label ?? category.name}
        categoryCode={category.category_code}
        candidates={candidates}
        isSubmitting={isSubmitting}
        onConfirm={handleAssignRequest}
      />

      <CategoryRoomConfirmDialog
        action={confirmAction}
        open={confirmOpen}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmAction(null);
            setPendingAssignIds([]);
          }
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}

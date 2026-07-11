"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconWorld } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWebCategoryManagementDataAction } from "@/actions/rooms";
import { WebCategoryCard } from "@/components/rooms/web-category-card";
import type {
  CategoryRoomSummary,
  WebCategoryManagementData,
} from "@/lib/room-web-display";
import { useBranch } from "@/contexts/branch-context";

type WebCategoriesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WebCategoriesDialog({
  open,
  onOpenChange,
}: WebCategoriesDialogProps) {
  const { filterBranchId, branches, canSelectBranch } = useBranch();
  const [data, setData] = useState<WebCategoryManagementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const showBranchTabs = branches.length > 1;

  useEffect(() => {
    if (!open) return;
    const defaultBranchId =
      filterBranchId ??
      (canSelectBranch ? (branches[0]?.id ?? null) : branches[0]?.id ?? null);
    setActiveBranchId(defaultBranchId);
  }, [open, filterBranchId, canSelectBranch, branches]);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    return getWebCategoryManagementDataAction(
      canSelectBranch ? null : filterBranchId,
      { viewAllBranches: canSelectBranch }
    ).then((result) => {
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.message);
        setData(null);
      }
      setIsLoading(false);
    });
  }, [canSelectBranch, filterBranchId]);

  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open, loadData]);

  const assignableRooms = useMemo(() => {
    const map = new Map<string, CategoryRoomSummary>();
    for (const room of data?.unassigned_rooms ?? []) {
      map.set(room.id, room);
    }
    for (const group of data?.groups ?? []) {
      for (const room of group.rooms) {
        map.set(room.id, room);
      }
    }
    return Array.from(map.values());
  }, [data]);

  const visibleGroups = useMemo(() => {
    if (!data) return [];
    if (!activeBranchId) return data.groups;
    return data.groups.filter((group) => group.branch_id === activeBranchId);
  }, [data, activeBranchId]);

  const visibleUnassignedRooms = useMemo(() => {
    if (!data) return [];
    if (!activeBranchId) return data.unassigned_rooms;
    return data.unassigned_rooms.filter(
      (room) => room.branch_id === activeBranchId
    );
  }, [data, activeBranchId]);

  const activeBranchName = useMemo(() => {
    if (!activeBranchId) return null;
    return branches.find((b) => b.id === activeBranchId)?.name ?? "Chi nhánh";
  }, [activeBranchId, branches]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,920px)] w-[min(96vw,1200px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IconWorld className="size-5 text-primary" />
            Hạng phòng hiển thị trên website
          </DialogTitle>
          <DialogDescription>
            Xem trước thẻ web, danh sách phòng vật lý và gán/bỏ gán hạng ngay
            tại đây.
            {activeBranchName ? ` Đang xem: ${activeBranchName}.` : null}
          </DialogDescription>

          {showBranchTabs ? (
            <Tabs
              value={activeBranchId ?? undefined}
              onValueChange={setActiveBranchId}
              className="mt-3 w-full"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
                {branches.map((branch) => (
                  <TabsTrigger
                    key={branch.id}
                    value={branch.id}
                    className="px-3"
                  >
                    {branch.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !data || visibleGroups.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {activeBranchName
                ? `Chưa có hạng phòng nào tại ${activeBranchName}. Hãy tạo hạng trong Cài đặt, rồi gán cho phòng.`
                : "Chưa có hạng phòng nào. Hãy tạo hạng trong Cài đặt, rồi gán cho phòng."}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                {visibleGroups.map((category) => (
                  <WebCategoryCard
                    key={`${category.branch_id}-${category.category_code}`}
                    category={category}
                    assignableRooms={assignableRooms}
                    defaultExpanded={category.rooms.length > 0}
                    showBranchName={false}
                    onUpdated={loadData}
                  />
                ))}
              </div>

              {visibleUnassignedRooms.length > 0 ? (
                <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        Phòng chưa gán hạng web
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Các phòng này không hiển thị trên website
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {visibleUnassignedRooms.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {visibleUnassignedRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <span className="truncate">
                          {room.room_number
                            ? `P.${room.room_number} — ${room.name}`
                            : room.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Gán qua &quot;Gán phòng&quot;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

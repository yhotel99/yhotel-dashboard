"use client";

import Link from "next/link";
import { IconExternalLink, IconSettings } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RoomCategoryItem } from "@/lib/room-categories";

type RoomCategoryPickerProps = {
  value?: string | null;
  options: RoomCategoryItem[];
  isLoading?: boolean;
  onChange: (code: string | undefined) => void;
  onSuggestName?: (name: string) => void;
};

export function RoomCategoryPicker({
  value,
  options,
  isLoading = false,
  onChange,
  onSuggestName,
}: RoomCategoryPickerProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Đang tải danh sách hạng phòng...
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-900 dark:text-amber-100">
          Chưa có hạng phòng nào. Bạn cần tạo hạng phòng trong Cài đặt trước
          khi phòng có thể hiển thị trên website.
        </p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/dashboard/settings?tab=room-categories">
            <IconSettings className="mr-2 size-4" />
            Tạo hạng phòng
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
            !value ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <p className="text-sm font-medium">Không gán hạng</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chỉ dùng nội bộ, không hiện web
          </p>
        </button>

        {options.map((item) => {
          const selected = value === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                onChange(item.code);
                if (onSuggestName && item.name.trim()) {
                  onSuggestName(item.name);
                }
              }}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                selected ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {item.code}
                  </p>
                </div>
                {!item.is_active ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    Ngừng
                  </Badge>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Hạng phòng quyết định phòng nào được gom chung trên website.
        </span>
        <Button type="button" variant="link" size="sm" className="h-auto p-0" asChild>
          <Link href="/dashboard/settings?tab=room-categories">
            Quản lý hạng phòng
            <IconExternalLink className="ml-1 size-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

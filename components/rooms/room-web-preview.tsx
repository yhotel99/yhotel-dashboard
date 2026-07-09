"use client";

import { IconBuilding, IconUsers, IconWorld } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AMENITIES_OPTIONS } from "@/lib/constants";
import {
  formatWebPriceRange,
  getRoomTypeBadgeLabel,
  type RoomWebPreviewData,
  type WebDisplayCategoryGroup,
} from "@/lib/room-web-display";
import { cn } from "@/lib/utils";

type RoomWebPreviewProps = {
  data: RoomWebPreviewData;
  className?: string;
  compact?: boolean;
};

export function RoomWebPreview({
  data,
  className,
  compact = false,
}: RoomWebPreviewProps) {
  const amenityLabels = data.amenities
    .slice(0, 4)
    .map(
      (value) =>
        AMENITIES_OPTIONS.find((option) => option.value === value)?.label ??
        value
    );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconWorld className="size-4 text-primary" />
              Xem trước web client
            </CardTitle>
            <CardDescription className="mt-1">
              Cách khách thấy hạng phòng trên website
            </CardDescription>
          </div>
          <Badge variant={data.is_visible_on_web ? "default" : "destructive"}>
            {data.is_visible_on_web ? "Hiển thị web" : "Ẩn trên web"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!data.is_visible_on_web ? (
          <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-sm text-amber-900 dark:text-amber-100">
            Phòng chưa có <strong>Hạng phòng web</strong> nên sẽ không xuất
            hiện trên website. Hãy chọn hạng phòng bên dưới.
          </div>
        ) : null}

        <div
          className={cn(
            "mt-3 overflow-hidden rounded-lg border bg-card",
            !data.is_visible_on_web && "mt-4 opacity-70"
          )}
        >
          <div
            className={cn(
              "grid gap-4 p-4",
              compact ? "grid-cols-1" : "md:grid-cols-[140px_1fr]"
            )}
          >
            <div className="relative h-36 overflow-hidden rounded-lg bg-muted md:h-full md:min-h-[140px]">
              {data.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.thumbnail_url}
                  alt={data.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Chưa có ảnh
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <IconBuilding className="size-4 shrink-0 text-primary" />
                    <h3 className="truncate font-semibold">{data.name}</h3>
                  </div>
                  {data.category_label ? (
                    <p className="text-xs text-muted-foreground">
                      Hạng: {data.category_label}
                    </p>
                  ) : null}
                  <p className="text-lg font-bold text-primary">
                    {data.price_per_night.toLocaleString("vi-VN")}₫
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      / đêm
                    </span>
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {getRoomTypeBadgeLabel(data.room_type)}
                </Badge>
              </div>

              {data.description ? (
                <div
                  className="line-clamp-2 text-sm text-muted-foreground [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: data.description }}
                />
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Chưa có mô tả — nên thêm mô tả để web hiển thị đẹp hơn
                </p>
              )}

              {data.max_guests > 0 ? (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <IconUsers className="size-4" />
                  <span>{data.max_guests} khách</span>
                </div>
              ) : null}

              {amenityLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {amenityLabels.map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                  {data.amenities.length > 4 ? (
                    <Badge variant="secondary" className="text-xs">
                      +{data.amenities.length - 4}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Website gom các phòng cùng hạng thành 1 thẻ. Tên hiển thị lấy từ phòng
          có mô tả trong cùng hạng.
        </p>
      </CardContent>
    </Card>
  );
}

type WebCategoryPreviewCardProps = {
  category: WebDisplayCategoryGroup;
};

export function WebCategoryPreviewCard({
  category,
}: WebCategoryPreviewCardProps) {
  const priceLabel = formatWebPriceRange(
    category.min_price,
    category.max_price
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-4 p-4 md:grid-cols-[120px_1fr]">
        <div className="relative h-28 overflow-hidden rounded-lg bg-muted md:h-full md:min-h-[110px]">
          {category.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.thumbnail_url}
              alt={category.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              Chưa có ảnh
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{category.name}</p>
              <p className="text-xs text-muted-foreground">
                {category.category_label ?? category.category_code}
              </p>
            </div>
            <Badge variant="outline">
              {getRoomTypeBadgeLabel(category.room_type)}
            </Badge>
          </div>
          <p className="text-base font-bold text-primary">
            {priceLabel}₫
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              / đêm
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {category.total_count} phòng vật lý · tối đa {category.max_guests}{" "}
            khách
          </p>
        </div>
      </div>
    </div>
  );
}

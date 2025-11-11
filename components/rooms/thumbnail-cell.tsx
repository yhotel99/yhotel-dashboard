import Image from "next/image";

export function ThumbnailCell({ thumbnailUrl }: { thumbnailUrl?: string }) {
  if (!thumbnailUrl) {
    return (
      <div className="flex items-center justify-center size-12 bg-muted rounded-md border border-dashed">
        <span className="text-muted-foreground text-[10px] text-center px-1">
          Chưa có ảnh
        </span>
      </div>
    );
  }

  return (
    <div className="relative size-12 rounded-md overflow-hidden border">
      <Image
        src={thumbnailUrl}
        alt="Room thumbnail"
        fill
        className="object-cover"
        sizes="48px"
      />
    </div>
  );
}


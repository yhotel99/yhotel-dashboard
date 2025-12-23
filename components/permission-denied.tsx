import { Lock } from "lucide-react";
import Link from "next/link";

export function PermissionDenied({ fallbackUrl }: { fallbackUrl: string }) {
  return (
    <div className="flex h-[100vh] flex-col items-center justify-center gap-4 text-center">
      <Lock className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Permission denied</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Bạn không có quyền truy cập vào chức năng này. Vui lòng liên hệ quản trị
        viên nếu bạn cho rằng đây là nhầm lẫn.
      </p>

      <Link
        href={fallbackUrl}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Quay về trang được phép
      </Link>
    </div>
  );
}

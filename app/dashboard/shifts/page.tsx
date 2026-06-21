import { AlertCircle } from "lucide-react";
import { ShiftsContent } from "@/components/hr-shifts/shifts-content";
import { fetchHrShiftData } from "@/lib/hr-shifts";

export default async function ShiftsPage() {
  const result = await fetchHrShiftData();

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-4 py-4 md:py-6 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Lịch ca làm việc</h1>
          <p className="text-muted-foreground text-sm">
            Xem lịch ca nhân viên từ hệ thống HR (chỉ đọc)
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium text-destructive">
              {result.error === "not_configured"
                ? "Chưa cấu hình kết nối HR Supabase"
                : "Không tải được dữ liệu"}
            </p>
            <p className="text-sm text-muted-foreground">{result.message}</p>
            {result.error === "not_configured" ? (
              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto mt-2">
                {`# .env.local
NEXT_PUBLIC_HR_SUPABASE_URL=<URL từ VITE_SUPABASE_URL của HR>
NEXT_PUBLIC_HR_SUPABASE_ANON_KEY=<key từ VITE_SUPABASE_ANON_KEY của HR>`}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <ShiftsContent data={result.data} />;
}

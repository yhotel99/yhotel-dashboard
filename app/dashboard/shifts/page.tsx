import { AlertCircle, ShieldAlert } from "lucide-react";
import { ShiftsContent } from "@/components/hr-shifts/shifts-content";
import { fetchHrAdminByEmail, fetchHrShiftData } from "@/lib/hr-shifts";
import { createClient } from "@/lib/supabase/server";

export default async function ShiftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <div className="flex flex-col gap-4 py-4 md:py-6 px-4 lg:px-6">
        <h1 className="text-2xl font-bold">Quản lý ca</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm">Vui lòng đăng nhập để truy cập trang quản lý ca.</p>
        </div>
      </div>
    );
  }

  const hrAdmin = await fetchHrAdminByEmail(user.email);

  if (!hrAdmin) {
    return (
      <div className="flex flex-col gap-4 py-4 md:py-6 px-4 lg:px-6">
        <h1 className="text-2xl font-bold">Quản lý ca</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium text-destructive">
              Không có quyền quản lý ca HR
            </p>
            <p className="text-sm text-muted-foreground">
              Tài khoản PMS ({user.email}) cần có role{" "}
              <strong>ADMIN</strong> hoặc <strong>BRANCH_ADMIN</strong> trong
              bảng <code className="text-xs">users</code> của HR Supabase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const result = await fetchHrShiftData(hrAdmin);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-4 py-4 md:py-6 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý ca</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý ca nhân viên — đồng bộ với HR Connect
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
                {`# .env
NEXT_PUBLIC_HR_SUPABASE_URL=<URL từ VITE_SUPABASE_URL của HR>
NEXT_PUBLIC_HR_SUPABASE_ANON_KEY=<key từ VITE_SUPABASE_ANON_KEY của HR>`}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <ShiftsContent initialData={result.data} hrAdmin={hrAdmin} />;
}

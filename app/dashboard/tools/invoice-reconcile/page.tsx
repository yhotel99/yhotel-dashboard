import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_URLS } from "@/lib/constants";
import { canViewAllBranches } from "@/lib/branch";
import { InvoiceReconcileTool } from "@/components/tools/invoice-reconcile";

export default async function InvoiceReconcilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !canViewAllBranches(profile.role)) {
    redirect(DASHBOARD_URLS.DASHBOARD);
  }

  return (
    <div className="flex w-full flex-col gap-5 px-3 py-4 sm:px-4 md:gap-6 md:px-6 md:py-6 xl:px-8">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:size-11 md:rounded-xl">
          <FileSpreadsheet className="size-5" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Đối soát Excel checkout
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Lọc booking → upload bảng kê HĐ (chỉ trong bộ nhớ) → xem chỗ lệch.
          </p>
        </div>
      </div>
      <InvoiceReconcileTool />
    </div>
  );
}

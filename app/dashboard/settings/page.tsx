import { SettingsForm } from "@/components/settings-form";
import { getSettingsAction } from "@/actions/settings";
import { listBranchBankAccountsAction } from "@/actions/bank-accounts";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLE } from "@/lib/constants";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    settings,
    branchBankAccounts,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getSettingsAction(),
    listBranchBankAccountsAction().catch(() => []),
  ]);

  let canEditBank = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    canEditBank = profile?.role === USER_ROLE.ADMIN;
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground text-sm">
          Cài đặt chung toàn hệ thống và tài khoản ngân hàng theo chi nhánh
        </p>
      </div>
      <SettingsForm
        initialData={settings}
        branchBankAccounts={branchBankAccounts}
        canEditBank={canEditBank}
      />
    </div>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin/server";

type RouteContext = {
  params: Promise<{ branchCode: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { branchCode } = await context.params;
    const normalizedCode = branchCode?.trim().toLowerCase();

    if (!normalizedCode) {
      return NextResponse.json(
        { error: "Branch code is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: branchRow, error: branchError } = await supabase
      .from("branches")
      .select("id, code, name")
      .eq("code", normalizedCode)
      .is("deleted_at", null)
      .eq("is_active", true)
      .maybeSingle();

    if (branchError || !branchRow) {
      return NextResponse.json(
        {
          error: `Không tìm thấy chi nhánh "${normalizedCode}". Kiểm tra URL (ví dụ: /qr/main).`,
        },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    const [{ data: bankRow }, { data: displayRow }] = await Promise.all([
      admin
        .from("branch_bank_accounts")
        .select(
          "bank_account_number, bank_name, bank_bin, bank_account_owner"
        )
        .eq("branch_id", branchRow.id)
        .maybeSingle(),
      admin
        .from("qr_display_state")
        .select("*")
        .eq("branch_id", branchRow.id)
        .maybeSingle(),
    ]);

    return NextResponse.json(
      {
        branch: branchRow,
        bank: bankRow ?? {
          bank_account_number: null,
          bank_name: null,
          bank_bin: null,
          bank_account_owner: null,
        },
        display: displayRow ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting public QR display:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// app/api/init-user/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin/server";

export async function POST() {
  try {
    const adminSupabase = createAdminClient();

    // Dữ liệu user cố định, chạy là tạo luôn
    const email = "admin@yhotel.vn";
    const password = "123456";
    const full_name = "Super Admin";
    const phone = "0123456789";

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name,
          phone,
        },
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

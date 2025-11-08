import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, phone, role, status } = body;

    // Validate required fields
    if (!email || !password || !full_name || !role || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role (only manager and staff when creating)
    if (role !== "manager" && role !== "staff") {
      return NextResponse.json(
        {
          error:
            "Invalid role. Only 'manager' and 'staff' are allowed when creating users.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name,
          phone: phone || null,
        },
        email_confirm: true, // email will be confirmed automatically
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
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

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin/server";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLE } from "@/lib/constants";

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
    if (role !== USER_ROLE.MANAGER && role !== USER_ROLE.STAFF) {
      return NextResponse.json(
        {
          error:
            "Invalid role. Only 'manager' and 'staff' are allowed when creating users.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    const { data } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user?.id)
      .single();

    console.log(profileData);

    if (
      ![USER_ROLE.ADMIN, USER_ROLE.MANAGER].includes(profileData?.role) ||
      !profileData
    ) {
      return NextResponse.json({ error: "Permission denied" }, { status: 400 });
    }

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

    const { error: profileUpdateError } = await adminSupabase
      .from("profiles")
      .update({
        role,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);

    if (profileUpdateError) {
      return NextResponse.json(
        {
          error:
            "User created but profile role could not be set. Update the user manually.",
        },
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

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLE } from "@/lib/constants";

const updatePasswordSchema = z.object({
  userId: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updatePasswordSchema.parse(body);

    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    const { data: currentUser } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.user?.id)
      .single();

    console.log(profileData);

    if (
      ![USER_ROLE.ADMIN, USER_ROLE.MANAGER].includes(profileData?.role) ||
      !profileData
    ) {
      return NextResponse.json({ error: "Permission denied" }, { status: 400 });
    }

    // Update user password using admin API
    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      validatedData.userId,
      {
        password: validatedData.password,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Password updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

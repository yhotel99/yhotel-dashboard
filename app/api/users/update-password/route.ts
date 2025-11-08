import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin/server";
import { z } from "zod";

const updatePasswordSchema = z.object({
  userId: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updatePasswordSchema.parse(body);

    const adminSupabase = createAdminClient();

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

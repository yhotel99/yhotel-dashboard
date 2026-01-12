import { NextResponse } from "next/server";
import { getCurrentUserPermissions } from "@/services/permissions";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/permissions
 * Trả về danh sách permissions của user hiện tại từ database
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch permissions from database
    const permissions = await getCurrentUserPermissions();

    return NextResponse.json({
      permissions,
      role: profile.role,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

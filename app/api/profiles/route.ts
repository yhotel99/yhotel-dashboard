import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";
import type { Profile } from "@/lib/types";

/**
 * GET /api/profiles
 * Fetch profiles with pagination and search
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const requestedBranchId = searchParams.get("branchId") || null;
    const { scope } = await getCurrentUserBranchScope();
    const branchId = resolveBranchFilterId(scope, requestedBranchId);

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    // Add search filter if search term exists
    // Search in full_name, email, and phone using OR operator
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const profilesData = (data || []) as Profile[];
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: profilesData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách người dùng";
    console.error("Error fetching profiles:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

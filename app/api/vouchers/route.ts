import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PaginationMeta, Voucher } from "@/lib/types";

/**
 * GET /api/vouchers
 * Query parameters:
 * - search: Search by code/name (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("vouchers")
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    if (search.trim() !== "") {
      const term = `%${search.trim()}%`;
      query = query.or(`code.ilike.${term},name.ilike.${term}`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: { data: Voucher[]; pagination: PaginationMeta } = {
      data: (data || []) as Voucher[],
      pagination: { total, page, limit, totalPages },
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách voucher";
    console.error("Error fetching vouchers:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


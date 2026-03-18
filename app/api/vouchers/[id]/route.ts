import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Voucher } from "@/lib/types";

/**
 * GET /api/vouchers/:id
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data as Voucher);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải voucher";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


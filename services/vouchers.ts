import { createClient } from "@/lib/supabase/server";
import type { PaginationMeta, Voucher, VouchersResponse } from "@/lib/types";

export async function getVouchersListWithPagination({
  search,
  page = 1,
  limit = 10,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
}): Promise<VouchersResponse> {
  if (page < 1 || limit < 1) {
    throw new Error("Page and limit must be greater than 0");
  }

  const supabase = await createClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("vouchers")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`code.ilike.${term},name.ilike.${term}`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  const response: { data: Voucher[]; pagination: PaginationMeta } = {
    data: (data || []) as Voucher[],
    pagination: { total, page, limit, totalPages },
  };

  return response;
}


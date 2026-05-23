import { createClient } from "@/lib/supabase/server";
import type { Customer, PaginationMeta } from "@/lib/types";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";

/**
 * Get customers list with pagination (optimized with RPC)
 * @param search - Search term (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Object with customers data and pagination metadata
 * 
 * Performance: Uses get_customers_with_stats RPC function
 * - Before: 41 queries (1 + 10 customers × 4 queries each)
 * - After: 1 query (single RPC call)
 */
export async function getCustomersListWithPagination({
  search,
  page = 1,
  limit = 10,
  branchId = null,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
  branchId?: string | null;
}): Promise<{
  data: Customer[];
  pagination: PaginationMeta;
}> {
  try {
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 🔥 Call optimized RPC function (1 query instead of 41 queries)
    const { scope } = await getCurrentUserBranchScope();
    const p_branch_id = resolveBranchFilterId(scope, branchId);

    const { data, error } = await supabase.rpc("get_customers_with_stats", {
      p_search: search?.trim() || null,
      p_from: from,
      p_to: to,
      p_branch_id,
    });

    if (error) {
      console.error("Error fetching customers:", error);
      throw new Error(error.message);
    }

    // Get total from first row (count(*) over() returns same value for all rows)
    const total = data?.[0]?.total_count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data || []) as Customer[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách khách hàng";
    console.error("Error fetching customers list:", err);
    throw new Error(errorMessage);
  }
}

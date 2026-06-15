import { createClient } from "@/lib/supabase/server";

type AuditEntityType = "booking" | "refund" | "room" | "payment";

export async function resolveAuditBranchId(params: {
  entityType: AuditEntityType;
  entityId: string;
  bookingId?: string;
  branchId?: string | null;
}): Promise<string | null> {
  if (params.branchId) {
    return params.branchId;
  }

  const supabase = await createClient();

  switch (params.entityType) {
    case "booking": {
      const { data } = await supabase
        .from("bookings")
        .select("branch_id")
        .eq("id", params.entityId)
        .maybeSingle();
      return data?.branch_id ?? null;
    }
    case "room": {
      const { data } = await supabase
        .from("rooms")
        .select("branch_id")
        .eq("id", params.entityId)
        .maybeSingle();
      return data?.branch_id ?? null;
    }
    case "payment": {
      const { data } = await supabase
        .from("payments")
        .select("branch_id")
        .eq("id", params.entityId)
        .maybeSingle();
      return data?.branch_id ?? null;
    }
    case "refund": {
      const { data: refund } = await supabase
        .from("refund_requests")
        .select("branch_id, booking_id")
        .eq("id", params.entityId)
        .maybeSingle();
      if (refund?.branch_id) return refund.branch_id;

      const bookingId = params.bookingId ?? refund?.booking_id;
      if (!bookingId) return null;
      const { data: booking } = await supabase
        .from("bookings")
        .select("branch_id")
        .eq("id", bookingId)
        .maybeSingle();
      return booking?.branch_id ?? null;
    }
    default:
      return null;
  }
}

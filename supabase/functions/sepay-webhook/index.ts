import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-sepay-signature",
};

interface SepayTransaction {
  id: number;
  gateway: string;
  content: string;
  transferType: "in" | "out";
  transferAmount: number;
  referenceCode: string;
}

type BookingCustomer = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type BookingRoomRow = {
  room?: { name?: string | null; room_number?: string | null } | null;
};

type BookingBranch = {
  name?: string | null;
  address?: string | null;
};

type BookingRow = {
  id: string;
  booking_code: string;
  status: string;
  total_amount: number | string | null;
  final_amount?: number | string | null;
  branch_id?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  number_of_nights?: number | null;
  total_guests?: number | null;
  advance_payment?: number | string | null;
  notes?: string | null;
  customers?: BookingCustomer | BookingCustomer[] | null;
  booking_rooms?: BookingRoomRow[] | null;
  branch?: BookingBranch | BookingBranch[] | null;
};

type CheckoutSessionRow = {
  id: string;
  payment_code: string;
  status: string;
  total_amount: number | string | null;
  final_amount: number | string | null;
  booking_id?: string | null;
};

type FinalizeResult = {
  ok: boolean;
  booking_id?: string;
  payment_code?: string;
  session_id?: string;
  error_code?: string;
  duplicate?: boolean;
};

function extractApiKey(header: string | null): string | null {
  if (!header) return null;
  const value = header.trim();
  const match = value.match(/^(apikey|bearer)\s+(.+)$/i);
  return match ? match[2].trim() : value;
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function expectedPayAmount(booking: {
  total_amount: number | string | null;
  final_amount?: number | string | null;
}): number {
  const finalAmount = booking.final_amount;
  if (finalAmount != null && finalAmount !== "") {
    return Number(finalAmount);
  }
  return Number(booking.total_amount ?? 0);
}

function expectedSessionAmount(session: CheckoutSessionRow): number {
  if (session.final_amount != null && session.final_amount !== "") {
    return Number(session.final_amount);
  }
  return Number(session.total_amount ?? 0);
}

function getCustomer(booking: BookingRow): BookingCustomer | null {
  const customers = booking.customers;
  if (!customers) return null;
  return Array.isArray(customers) ? (customers[0] ?? null) : customers;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const expectedApiKey =
      Deno.env.get("SEPAY_WEBHOOK_API_KEY") ||
      Deno.env.get("PAY2S_WEBHOOK_API_KEY");
    if (!expectedApiKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiKeyHeader =
      req.headers.get("x-api-key") ||
      req.headers.get("apikey") ||
      extractApiKey(req.headers.get("Authorization"));

    if (!apiKeyHeader || !secureCompare(apiKeyHeader, expectedApiKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const transaction = (await req.json()) as SepayTransaction;

    if (!transaction?.id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionId = transaction.referenceCode || String(transaction.id);
    const content = transaction.content?.trim() ?? "";

    const { data: existingLog } = await supabase
      .from("payment_logs")
      .select("transaction_id, status")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (
      existingLog &&
      ["success", "confirmed", "underpaid", "skipped"].includes(
        existingLog.status,
      )
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            transaction_id: transactionId,
            status: "skipped",
            reason: "Already processed",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await supabase.from("payment_logs").upsert({
      transaction_id: transactionId,
      amount: transaction.transferAmount,
      content,
      bank_code: transaction.gateway,
      status: "processing",
      raw_payload: transaction,
    });

    if (transaction.transferType !== "in") {
      await supabase
        .from("payment_logs")
        .update({ status: "skipped", reason: "OUT transaction" })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: true,
          result: { transaction_id: transactionId, status: "skipped" },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const paymentCodeMatch = content.match(/YH\d{8}[A-Z0-9]{6}/i);
    const paymentCode = paymentCodeMatch?.[0]?.toUpperCase() ?? null;

    if (!paymentCode) {
      await supabase
        .from("payment_logs")
        .update({
          status: "unmatched",
          reason: "No valid YH payment code in content",
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          reason: "no_payment_code",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("checkout_sessions")
      .select("id, payment_code, status, total_amount, final_amount, booking_id")
      .ilike("payment_code", paymentCode)
      .maybeSingle();

    if (!session || sessionError) {
      await supabase
        .from("payment_logs")
        .update({
          booking_code: paymentCode,
          status: "error",
          reason: "Checkout session not found",
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: false,
          result: {
            transaction_id: transactionId,
            status: "error",
            reason: "Checkout session not found",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sessionRow = session as CheckoutSessionRow;
    const receivedAmount = Number(transaction.transferAmount);
    const expectedAmount = expectedSessionAmount(sessionRow);

    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      await supabase
        .from("payment_logs")
        .update({
          booking_id: sessionRow.booking_id ?? null,
          booking_code: paymentCode,
          status: "skipped",
          reason: "Invalid transfer amount",
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          reason: "invalid_amount",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      expectedAmount > 0 &&
      Math.round(receivedAmount) < Math.round(expectedAmount)
    ) {
      await supabase
        .from("payment_logs")
        .update({
          booking_id: sessionRow.booking_id ?? null,
          booking_code: paymentCode,
          status: "underpaid",
          reason: `Paid ${receivedAmount}, expected ${expectedAmount}`,
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: false,
          result: {
            transaction_id: transactionId,
            status: "underpaid",
            received: receivedAmount,
            expected: expectedAmount,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (sessionRow.status === "completed") {
      await supabase
        .from("payment_logs")
        .update({
          booking_id: sessionRow.booking_id ?? null,
          booking_code: paymentCode,
          status: "skipped",
          reason: "Session already completed",
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            transaction_id: transactionId,
            status: "skipped",
            reason: "Session already completed",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (sessionRow.status === "failed") {
      await supabase
        .from("payment_logs")
        .update({
          booking_id: sessionRow.booking_id ?? null,
          booking_code: paymentCode,
          status: "skipped",
          reason: "Session already failed",
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            transaction_id: transactionId,
            status: "skipped",
            reason: "Session already failed",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: finalizeData, error: finalizeError } = await supabase.rpc(
      "finalize_checkout_session",
      {
        p_session_id: null,
        p_payment_code: paymentCode,
        p_payment_method: "bank_transfer",
      },
    );

    if (finalizeError) {
      console.error(
        "[sepay-webhook] finalize_checkout_session failed:",
        finalizeError,
      );
      await supabase
        .from("payment_logs")
        .update({
          booking_id: sessionRow.booking_id ?? null,
          booking_code: paymentCode,
          status: "error",
          reason: "Finalize session failed",
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: false,
          result: {
            transaction_id: transactionId,
            status: "error",
            reason: "Finalize session failed",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const finalizeResult =
      finalizeData && typeof finalizeData === "object"
        ? (finalizeData as FinalizeResult)
        : null;

    if (!finalizeResult?.ok || !finalizeResult.booking_id) {
      const errorCode = finalizeResult?.error_code ?? "INVALID_FINALIZE_RESPONSE";
      await supabase
        .from("payment_logs")
        .update({
          booking_id: sessionRow.booking_id ?? null,
          booking_code: paymentCode,
          status: "error",
          reason: `Finalize failed: ${errorCode}`,
        })
        .eq("transaction_id", transactionId);
      return new Response(
        JSON.stringify({
          success: false,
          result: {
            transaction_id: transactionId,
            status: "error",
            reason: `Finalize failed: ${errorCode}`,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const finalizedBookingId = finalizeResult.booking_id;

    await supabase
      .from("payment_logs")
      .update({
        booking_id: finalizedBookingId,
        booking_code: paymentCode,
        status: "success",
        reason: "sepay_confirmed",
      })
      .eq("transaction_id", transactionId);

    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select(
          `
          id,
          booking_code,
          status,
          total_amount,
          final_amount,
          branch_id,
          check_in,
          check_out,
          number_of_nights,
          total_guests,
          advance_payment,
          notes,
          customers ( full_name, email, phone ),
          booking_rooms (
            room:room_id ( name, room_number )
          ),
          branch:branch_id ( name, address )
        `,
        )
        .eq("id", finalizedBookingId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!booking) {
        console.warn(
          "[sepay-webhook] Skip email: booking not found after finalize",
          finalizedBookingId,
        );
        return new Response(
          JSON.stringify({
            success: true,
            payment_code: paymentCode,
            booking_id: finalizedBookingId,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const bookingRow = booking as BookingRow;
      const customer = getCustomer(bookingRow);
      const customerEmail = customer?.email?.trim();

      if (!customerEmail) {
        console.warn(
          "[sepay-webhook] Skip email: missing customer email",
            paymentCode,
        );
      } else {
        const roomLabels: string[] = [];
        for (const br of bookingRow.booking_rooms ?? []) {
          const name = br.room?.name?.trim() || "";
          const number = br.room?.room_number?.trim() || "";
          if (name && number) roomLabels.push(`${name} (${number})`);
          else if (name) roomLabels.push(name);
          else if (number) roomLabels.push(`Phòng ${number}`);
        }
        const roomType = roomLabels.length > 0 ? roomLabels.join("\n") : "-";
        const branchRaw = bookingRow.branch;
        const branch = Array.isArray(branchRaw) ? branchRaw[0] : branchRaw;

        const { data: settings } = await supabase
          .from("settings")
          .select("site_title, contact_phone, contact_email, contact_address")
          .limit(1)
          .maybeSingle();

        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_code: bookingRow.booking_code,
            room_name: roomType,
            customer_email: customerEmail,
            customer_name: customer?.full_name ?? "Quý khách",
            customer_phone: customer?.phone ?? null,
            check_in: bookingRow.check_in,
            check_out: bookingRow.check_out,
            number_of_nights: bookingRow.number_of_nights ?? null,
            total_guests: bookingRow.total_guests ?? null,
            total_price: bookingRow.final_amount ?? bookingRow.total_amount,
            advance_payment:
              bookingRow.advance_payment != null
                ? Number(bookingRow.advance_payment)
                : null,
            notes: bookingRow.notes ?? null,
            branch_name: branch?.name ?? null,
            hotel_address: branch?.address || settings?.contact_address || null,
            hotel_name: settings?.site_title || "YHotel",
            hotline: settings?.contact_phone || "0787 913 388",
            support_email: settings?.contact_email || "hello@yhotel.vn",
            payment_status_label: "Đã thanh toán",
          }),
        });

        if (!emailRes.ok) {
          console.error(
            "[sepay-webhook] Email failed:",
            emailRes.status,
            await emailRes.text().catch(() => ""),
          );
        }
      }
    } catch (e) {
      console.error("[sepay-webhook] Email error:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_code: paymentCode,
        booking_id: finalizedBookingId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Sepay webhook error:", error);
    return new Response(
      JSON.stringify({
        error: "Webhook failed",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

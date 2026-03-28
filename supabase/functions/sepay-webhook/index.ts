import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};


/* ================== AUTH HELPERS ================== */
function extractSepayApiKey(req: Request) {
  const raw = req.headers.get("authorization");
  if (!raw) return null;

  console.log(raw)

  // SePay spec: "Authorization: Apikey <KEY>"
  const prefix = "Apikey ";
  if (!raw.startsWith(prefix)) return null;

  return raw.slice(prefix.length).trim();
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    /* ================== AUTH ================== */
    const expectedApiKey = Deno.env.get("SEPAY_WEBHOOK_API_KEY");
    if (!expectedApiKey) {
      throw new Error("Missing SEPAY_WEBHOOK_API_KEY");
    }

    const incomingKey = extractSepayApiKey(req);

    if (!incomingKey || !safeEqual(incomingKey, expectedApiKey)) {
      console.warn("Unauthorized webhook", {
        ip: req.headers.get("x-forwarded-for"),
        ua: req.headers.get("user-agent"),
      });

      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    /* ================== SUPABASE ================== */ 
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Thiếu cấu hình Supabase");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    /* ================== PARSE PAYLOAD ================== */ // SEPay sends a single transaction object, not an array
    const transaction = await req.json();
    if (!transaction || !transaction.id) {
      return new Response(JSON.stringify({
        error: "Không có giao dịch"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Use referenceCode as transaction_id, fallback to id if referenceCode is empty
    const transactionId = transaction.referenceCode || String(transaction.id);
    const content = transaction.content?.trim() || "";
    console.log("👉 Processing SEPay transaction:", transactionId);
    /* ========== UPSERT LOG: processing ========== */ 
    await supabase.from("payment_logs").upsert({
      transaction_id: transactionId,
      amount: transaction.transferAmount,
      content: content,
      bank_code: transaction.gateway,
      status: "processing",
      raw_payload: transaction
    });
    /* ========== SKIP OUT ========== */ if (transaction.transferType !== "in") {
      await supabase.from("payment_logs").update({
        status: "skipped",
        reason: "OUT transaction"
      }).eq("transaction_id", transactionId);
      return new Response(JSON.stringify({
        success: true,
        result: {
          transaction_id: transactionId,
          status: "skipped"
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    /* ========== VALIDATE CONTENT ========== */ if (!content) {
      await supabase.from("payment_logs").update({
        status: "unmatched",
        reason: "No transfer content"
      }).eq("transaction_id", transactionId);
      return new Response(JSON.stringify({
        success: true,
        result: {
          transaction_id: transactionId,
          status: "unmatched",
          reason: "No transfer content"
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Extract booking code from content (format: YH + YYYYMMDD + 6 alphanumeric chars = 16 chars total)
    // Example: "YH20260113A1CD0F   Ma giao dich  Trace427638" -> "YH20260113A1CD0F"
    const bookingCodeMatch = content.match(/\bYH[A-Z0-9]{14}\b/);
    const bookingCode = bookingCodeMatch?.[0] ?? null;
      /* ========== NO BOOKING CODE → UNMATCHED ========== */
    if (!bookingCode) {
      await supabase
        .from("payment_logs")
        .update({
          status: "unmatched",
          reason: "No valid YH booking code in content",
          booking_code: null,
        })
        .eq("transaction_id", transactionId);

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            transaction_id: transactionId,
            status: "unmatched",
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    /* ========== FIND BOOKING ========== */ 
    const { data: booking, error: bookingError } = await supabase.from("bookings").select(`
        id,
        booking_code,
        status,
        total_amount,
        final_amount,
        check_in,
        check_out,
        customers ( full_name, email ),
        booking_rooms(
          room:room_id(name),
          amount
        )
      `).eq("booking_code", bookingCode).is("deleted_at", null).maybeSingle();

    if (bookingError) {
      await supabase.from("payment_logs").update({
        booking_code: bookingCode,
        status: "error",
        reason: "Booking query failed"
      }).eq("transaction_id", transactionId);

      return new Response(JSON.stringify({
        success: false,
        error: "Booking query failed"
      }), { status: 500, headers: corsHeaders });
    }

    if (!booking) {
      await supabase.from("payment_logs").update({
        booking_code: bookingCode,
        status: "unmatched",
        reason: "Booking not found"
      }).eq("transaction_id", transactionId);
      return new Response(JSON.stringify({
        success: true,
        result: {
          transaction_id: transactionId,
          status: "unmatched",
          reason: "Booking not found"
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    /* ========== AMOUNT CHECK ========== */ 
    const receivedAmount = Number(transaction.transferAmount);
    const expectedAmount = Number(booking.final_amount ?? booking.total_amount);
    console.log({
      receivedAmount,
      expectedAmount,
      booking,
      test: receivedAmount < expectedAmount
    });
    if (receivedAmount < expectedAmount) {
      const missingAmount = expectedAmount - receivedAmount;
      console.log(`test underpaid`);
      await supabase.from("payment_logs").update({
        booking_id: booking.id,
        booking_code: bookingCode,
        status: "underpaid",
        reason: `Paid ${receivedAmount}, expected ${expectedAmount}, thiếu ${missingAmount}`
      }).eq("transaction_id", transactionId);
      return new Response(JSON.stringify({
        success: true,
        result: {
          transaction_id: transactionId,
          status: "underpaid",
          received: receivedAmount,
          expected: expectedAmount,
          missingAmount
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    /* ========== ALREADY CONFIRMED ========== */ if ([
      "confirmed",
      "checked_in"
    ].includes(booking.status)) {
      await supabase.from("payment_logs").update({
        booking_id: booking.id,
        booking_code: bookingCode,
        status: "skipped",
        reason: "Already confirmed"
      }).eq("transaction_id", transactionId);
      return new Response(JSON.stringify({
        success: true,
        result: {
          transaction_id: transactionId,
          status: "skipped",
          reason: "Already confirmed"
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    /* ========== CONFIRM BOOKING ========== */ const { error: confirmError } = await supabase.rpc("confirm_booking_secure", {
      p_booking_id: booking.id
    });
    if (confirmError) {
      await supabase.from("payment_logs").update({
        booking_id: booking.id,
        booking_code: bookingCode,
        status: "error",
        reason: "Confirmation failed"
      }).eq("transaction_id", transactionId);
      return new Response(JSON.stringify({
        success: false,
        result: {
          transaction_id: transactionId,
          status: "error",
          reason: "Confirmation failed"
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    /* ========== SUCCESS ========== */ await supabase.from("payment_logs").update({
      booking_id: booking.id,
      booking_code: bookingCode,
      status: "success"
    }).eq("transaction_id", transactionId);
    /* ========== SEND EMAIL (NON-BLOCKING) ========== */ try {
        const roomNames = (booking.booking_rooms ?? [])
  .map((br: { room?: { name?: string } }) => br.room?.name)
  .filter(Boolean);
const room_type = roomNames.length > 0 ? roomNames.join(", ") : "-";

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
        booking_code: booking.booking_code,
        room_name: room_type,
        customer_email: booking.customers?.email,
        customer_name: booking.customers?.full_name ?? "Quý khách",
        check_in: booking.check_in,
        check_out: booking.check_out,
        total_price: booking.final_amount,
        hotel_name: "YHotel",
        hotline: "0787 913 388",
        support_email: "hello@yhotel.vn",
      }),
      });
    } catch (e) {
      console.error("Email error:", e);
    }
    return new Response(JSON.stringify({
      success: true,
      result: {
        transaction_id: transactionId,
        status: "success"
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({
      error: "Webhook failed",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

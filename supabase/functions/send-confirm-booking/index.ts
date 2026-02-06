import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// 👉 Hàm format
function formatDateTimePretty(isoString, options = {}) {
  const { timeZone = 7, showIcons = true, format = "full" } = options;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return showIcons ? "⏰ --:-- | 📅 Ngày không hợp lệ" : "--:-- | Ngày không hợp lệ";
  }
  const localDate = new Date(date.getTime() + timeZone * 60 * 60 * 1000);
  const hours = localDate.getUTCHours().toString().padStart(2, "0");
  const minutes = localDate.getUTCMinutes().toString().padStart(2, "0");
  const day = localDate.getUTCDate();
  const month = localDate.getUTCMonth() + 1;
  const year = localDate.getUTCFullYear();
  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy"
  ];
  const weekday = weekdays[localDate.getUTCDay()];
  const timeStr = `${hours}:${minutes}`;
  const dateStr = `${weekday}, ${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
  if (format === "time") return showIcons ? `⏰ ${timeStr}` : timeStr;
  if (format === "date") return showIcons ? `📅 ${dateStr}` : dateStr;
  return showIcons ? `⏰ ${timeStr} | 📅 ${dateStr}` : `${timeStr} | ${dateStr}`;
}
Deno.serve(async (req)=>{
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405
      });
    }
    const body = await req.json();
    if (!body?.booking_code) {
      return new Response(JSON.stringify({
        error: "booking_code required"
      }), {
        status: 400
      });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({
        error: "Missing environment variables"
      }), {
        status: 500
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    // 1️⃣ Lấy booking theo booking_code
    const { data: booking, error: findErr } = await supabase.from("bookings").select(`
        id,
        booking_code,
        room:room_id(name),
        check_in,
        check_out,
        customer:customer_id(email, full_name)
      `).eq("booking_code", body.booking_code).single();
    if (findErr || !booking) {
      return new Response(JSON.stringify({
        error: "Booking not found"
      }), {
        status: 404
      });
    }
    // 2️⃣ Xác nhận booking qua RPC
    const { error: confirmErr } = await supabase.rpc("confirm_booking_secure", {
      p_booking_id: booking.id
    });
    if (confirmErr) {
      return new Response(JSON.stringify({
        error: confirmErr.message
      }), {
        status: 500
      });
    }
    // 🎨 Pretty datetime
    const checkInFormatted = formatDateTimePretty(booking.check_in);
    const checkOutFormatted = formatDateTimePretty(booking.check_out);
    // 3️⃣ Gửi email
    // 📧 Email HTML
    const html = `
      <div style="font-family: Arial; line-height: 1.6;">
        <h2>🎉 Xác nhận đặt phòng thành công</h2>

        <p>Xin chào <strong>${booking.customer?.full_name ?? "-"}</strong>,</p>

        <p>Cảm ơn bạn đã đặt phòng tại chúng tôi.</p>

        <h3>📌 Thông tin đặt phòng</h3>

        <ul>
          <li><strong>🔑 Mã đặt phòng:</strong> ${booking.booking_code}</li>
          <li><strong>🏨 Phòng:</strong> ${booking.room?.name ?? "-"}</li>
          <li><strong>📥 Check-in:</strong> ${checkInFormatted}</li>
          <li><strong>📤 Check-out:</strong> ${checkOutFormatted}</li>
        </ul>

        <p>Chúng tôi sẽ liên hệ nếu cần thêm thông tin.</p>

        <p>Trân trọng,<br><strong>YHotel Booking Team</strong></p>
      </div>
    `;
    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "YHotel Booking <noreply@yhotel.vn>",
        to: [
          booking.customer?.email ?? "-"
        ],
        subject: `Xác nhận đặt phòng – ${booking.booking_code}`,
        html
      })
    });
    const result = await resend.json();
    if (!resend.ok) {
      return new Response(JSON.stringify({
        error: "Email failed",
        result
      }), {
        status: 500
      });
    }
    return new Response(JSON.stringify({
      success: true,
      booking,
      email: result
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500
    });
  }
});

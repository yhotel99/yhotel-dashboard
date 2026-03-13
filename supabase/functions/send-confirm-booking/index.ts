// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/* =======================
   Types
======================= */
interface RequestPayload {
  booking_code: string;
}

export interface BookingEmailPayload {
  customer_name?: string;
  customer_email?: string;

  hotel_name?: string;
  booking_code: string;
  room_type: string;

  check_in: string;
  check_out: string;
  total_price?: string;

  hotline?: string;
  support_email?: string;
}

/* =======================
   Env
======================= */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

/* =======================
   Utils
======================= */
function formatDateTimePretty(
  isoString: string,
  options: {
    timeZone?: number;
    showIcons?: boolean;
    format?: "full" | "time" | "date";
  } = {},
): string {
  const {
    timeZone = 7,
    showIcons = true,
    format = "full",
  } = options;

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return showIcons
      ? "⏰ --:-- | 📅 Ngày không hợp lệ"
      : "--:-- | Ngày không hợp lệ";
  }

  const localDate = new Date(date.getTime() + timeZone * 3600 * 1000);

  const hours = localDate.getUTCHours().toString().padStart(2, "0");
  const minutes = localDate.getUTCMinutes().toString().padStart(2, "0");
  const day = localDate.getUTCDate().toString().padStart(2, "0");
  const month = (localDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = localDate.getUTCFullYear();

  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  const weekday = weekdays[localDate.getUTCDay()];
  const timeStr = `${hours}:${minutes}`;
  const dateStr = `${weekday}, ${day}/${month}/${year}`;

  if (format === "time") return showIcons ? `⏰ ${timeStr}` : timeStr;
  if (format === "date") return showIcons ? `📅 ${dateStr}` : dateStr;

  return showIcons
    ? `⏰ ${timeStr} | 📅 ${dateStr}`
    : `${timeStr} | ${dateStr}`;
}

function formatCurrencyVND(amount?: string | number): string {
  if (amount === undefined || amount === null) return "";

  const numeric = Number(amount);

  if (Number.isNaN(numeric)) return "";

  return numeric.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
}

/* =======================
   Email Template
======================= */
export function renderBookingConfirmationHTML(
  payload: BookingEmailPayload,
) {
  const {
    customer_name = "Quý khách",
    hotel_name = "YHotel",
    booking_code,
    room_type,
    check_in,
    check_out,
    total_price = "—",
    hotline = "0787 913 388",
    support_email = "hello@yhotel.vn",
  } = payload;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xác nhận đặt phòng</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0">
    <tr>
      <td align="center">
        <table width="600" style="background:#fff;border-radius:6px">
          <tr>
            <td style="background:#0d6efd;color:#fff;padding:20px">
              <h1 style="margin:0;font-size:20px">XÁC NHẬN ĐẶT PHÒNG</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;font-size:14px;line-height:1.6;color:#333">
              <p>Kính chào <strong>${customer_name}</strong>,</p>

              <p>
                Cảm ơn Quý khách đã đặt phòng tại <strong>${hotel_name}</strong>.
                Thông tin chi tiết:
              </p>

              <table width="100%" style="border-collapse:collapse;margin:16px 0">
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Mã đặt phòng</td>
                  <td style="border:1px solid #ddd;padding:8px"><strong>${booking_code}</strong></td>
                </tr>
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Phòng</td>
                  <td style="border:1px solid #ddd;padding:8px">${room_type}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Nhận phòng</td>
                  <td style="border:1px solid #ddd;padding:8px">${check_in}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Trả phòng</td>
                  <td style="border:1px solid #ddd;padding:8px">${check_out}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Tổng tiền</td>
                  <td style="border:1px solid #ddd;padding:8px"><strong>${formatCurrencyVND(total_price)}</strong></td>
                </tr>
              </table>

              <p>
                📞 Hotline: ${hotline}<br/>
                ☎️ Điện thoại: +84 7879 13388<br/>
                💬 Zalo/whatsapp: +84 786 456 469<br/>
                📧 Email: ${support_email}
              </p>

              <p>
                Trân trọng,<br/>
                <strong>${hotel_name}</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f1f1f1;padding:12px;text-align:center;font-size:12px;color:#666">
              Email này được gửi tự động, vui lòng không phản hồi
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* =======================
   Handler
======================= */
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
      });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500 },
      );
    }

    const body: RequestPayload = await req.json();
    if (!body?.booking_code) {
      return new Response(JSON.stringify({ error: "booking_code required" }), {
        status: 400,
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_code,
        check_in,
        check_out,
        total_amount,
        final_amount,
        customer:customer_id(email, full_name),
        booking_rooms(
          room:room_id(name),
          amount
        )
      `)
      .eq("booking_code", body.booking_code)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
      });
    }

    const roomNames = (booking.booking_rooms ?? [])
  .map((br: { room?: { name?: string } }) => br.room?.name)
  .filter(Boolean);
const room_type = roomNames.length > 0 ? roomNames.join(", ") : "-";

    await supabase.rpc("confirm_booking_secure", {
      p_booking_id: booking.id,
    });

    const html = renderBookingConfirmationHTML({
      customer_name: booking.customer?.full_name,
      customer_email: booking.customer?.email,
      booking_code: booking.booking_code,
      room_type: room_type,
      check_in: formatDateTimePretty(booking.check_in),
      check_out: formatDateTimePretty(booking.check_out),
      total_price: booking.final_amount ?? booking.total_amount
    });

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "YHotel Booking <noreply@yhotel.vn>",
        to: [booking.customer?.email],
        subject: `Xác nhận đặt phòng – ${booking.booking_code}`,
        html,
      }),
    });

    if (!resend.ok) {
      return new Response(JSON.stringify({ error: "Send email failed" }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});

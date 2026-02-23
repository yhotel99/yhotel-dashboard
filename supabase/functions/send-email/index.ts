import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailPayload {
  booking_code: string;
  room_name: string;
  customer_email: string;
  customer_name: string;
  check_in: string;
  check_out: string;
  total_price?: string;
  hotel_name?: string;
  hotline?: string;
  support_email?: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

/* =======================
   Utils
======================= */
function formatDateTimePretty(
  isoString: string,
  timeZone = 7,
): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return "⏰ --:-- | 📅 Ngày không hợp lệ";
  }

  const local = new Date(date.getTime() + timeZone * 3600 * 1000);

  const h = local.getUTCHours().toString().padStart(2, "0");
  const m = local.getUTCMinutes().toString().padStart(2, "0");
  const d = local.getUTCDate().toString().padStart(2, "0");
  const mo = (local.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = local.getUTCFullYear();

  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  const weekday = weekdays[local.getUTCDay()];

  return `⏰ ${h}:${m} | 📅 ${weekday}, ${d}/${mo}/${y}`;
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
   Handler
======================= */
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!RESEND_API_KEY) {
      return new Response("Missing RESEND_API_KEY", { status: 500 });
    }

    const payload: EmailPayload = await req.json();

    const html = `<!DOCTYPE html>
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
              <p>Kính chào <strong>${payload.customer_name}</strong>,</p>

              <p>
                Cảm ơn Quý khách đã đặt phòng tại 
                <strong>${payload.hotel_name ?? "YHotel"}</strong>.
                Thông tin chi tiết:
              </p>

              <table width="100%" style="border-collapse:collapse;margin:16px 0">
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Mã đặt phòng</td>
                  <td style="border:1px solid #ddd;padding:8px">
                    <strong>${payload.booking_code}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Phòng</td>
                  <td style="border:1px solid #ddd;padding:8px">
                    ${payload.room_name}
                  </td>
                </tr>
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Nhận phòng</td>
                  <td style="border:1px solid #ddd;padding:8px">
                    ${formatDateTimePretty(payload.check_in)}
                  </td>
                </tr>
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Trả phòng</td>
                  <td style="border:1px solid #ddd;padding:8px">
                    ${formatDateTimePretty(payload.check_out)}
                  </td>
                </tr>
                ${
                  payload.total_price
                    ? `
                <tr>
                  <td style="border:1px solid #ddd;padding:8px">Tổng tiền</td>
                  <td style="border:1px solid #ddd;padding:8px">
                    <strong>${formatCurrencyVND(payload.total_price)}</strong>
                  </td>
                </tr>`
                    : ""
                }
              </table>

              <p>
                📞 ${payload.hotline ?? "0787 913 388"}<br/>
                📧 ${payload.support_email ?? "hello@yhotel.vn"}
              </p>

              <p>
                Trân trọng,<br/>
                <strong>${payload.hotel_name ?? "YHotel"}</strong>
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

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "YHotel Booking <noreply@yhotel.vn>",
        to: [payload.customer_email],
        subject: `Xác nhận đặt phòng – ${payload.booking_code}`,
        html,
      }),
    });

    if (!resend.ok) {
      const err = await resend.text();
      return new Response(err, { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Internal error", { status: 500 });
  }
});

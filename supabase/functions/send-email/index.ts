import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailPayload {
  booking_code: string;
  room_name: string;
  customer_email: string;
  customer_name: string;
  check_in: string;
  check_out: string;
  total_price?: string | number;
  hotel_name?: string;
  hotline?: string;
  support_email?: string;
  hotel_address?: string | null;
  branch_name?: string | null;
  room_numbers?: string | null;
  number_of_nights?: number | null;
  total_guests?: number | null;
  customer_phone?: string | null;
  payment_status_label?: string | null;
  advance_payment?: number | null;
  notes?: string | null;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTimePretty(isoString: string, timeZone = 7): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return "--:-- | Ngày không hợp lệ";
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

  return `${h}:${m} | ${weekday}, ${d}/${mo}/${y}`;
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

function detailRow(label: string, value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "";
  return `
                <tr>
                  <td style="border:1px solid #ddd;padding:8px;width:40%;vertical-align:top;color:#555">${label}</td>
                  <td style="border:1px solid #ddd;padding:8px">${value}</td>
                </tr>`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!RESEND_API_KEY) {
      return new Response("Missing RESEND_API_KEY", { status: 500 });
    }

    const payload: EmailPayload = await req.json();

    if (!payload.customer_email?.trim() || !payload.booking_code?.trim()) {
      return new Response("Missing required fields", { status: 400 });
    }

    const hotelName = escapeHtml(payload.hotel_name ?? "YHotel");
    const customerName = escapeHtml(payload.customer_name || "Quý khách");
    const bookingCode = escapeHtml(payload.booking_code);
    const hotline = escapeHtml(payload.hotline ?? "0787 913 388");
    const supportEmail = escapeHtml(payload.support_email ?? "hello@yhotel.vn");
    const phone = "+84 7879 13388";
    const zalo = "+84 786 456 469";

    const roomParts = (payload.room_name || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const roomLabel =
      roomParts.length > 0
        ? roomParts.map((line) => escapeHtml(line)).join("<br/>")
        : "-";

    const stayParts: string[] = [];
    if (payload.number_of_nights != null && payload.number_of_nights > 0) {
      stayParts.push(`${payload.number_of_nights} đêm`);
    }
    if (payload.total_guests != null && payload.total_guests > 0) {
      stayParts.push(`${payload.total_guests} khách`);
    }
    const staySummary = stayParts.join(" · ");

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
              <p>Kính chào <strong>${customerName}</strong>,</p>

              <p>
                Cảm ơn Quý khách đã đặt phòng tại <strong>${hotelName}</strong>.
                Đặt phòng đã được xác nhận. Thông tin chi tiết:
              </p>

              <table width="100%" style="border-collapse:collapse;margin:16px 0">
                ${detailRow("Mã đặt phòng", `<strong>${bookingCode}</strong>`)}
                ${detailRow(
                  "Chi nhánh",
                  payload.branch_name ? escapeHtml(payload.branch_name) : ""
                )}
                ${detailRow(
                  "Địa chỉ",
                  payload.hotel_address ? escapeHtml(payload.hotel_address) : ""
                )}
                ${detailRow("Phòng", roomLabel)}
                ${detailRow("Nhận phòng", formatDateTimePretty(payload.check_in))}
                ${detailRow("Trả phòng", formatDateTimePretty(payload.check_out))}
                ${detailRow("Thời gian lưu trú", staySummary)}
                ${
                  payload.total_price != null && payload.total_price !== ""
                    ? detailRow(
                      "Tổng tiền",
                      `<strong>${formatCurrencyVND(payload.total_price)}</strong>`
                    )
                    : ""
                }
              </table>

              <p>
                📞 Hotline: ${hotline}<br/>
                ☎️ Điện thoại: ${phone}<br/>
                💬 Zalo/WhatsApp: ${zalo}<br/>
                📧 Email: ${supportEmail}
              </p>

              <p>
                Trân trọng,<br/>
                <strong>${hotelName}</strong>
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
        from: "YHotel Booking <hello@yhotel.vn>",
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

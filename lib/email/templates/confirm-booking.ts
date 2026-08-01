import { escapeHtml, formatCurrencyVND } from "@/lib/email/utils";

export type ConfirmBookingEmailPayload = {
  customer_name: string;
  hotel_name: string;
  booking_code: string;
  room_type: string;
  check_in: string;
  check_out: string;
  total_price: number;
  hotline: string;
  support_email: string;
  /** Optional details — only shown when present */
  hotel_address?: string | null;
  branch_name?: string | null;
  room_numbers?: string | null;
  number_of_nights?: number | null;
  total_guests?: number | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  payment_status_label?: string | null;
  advance_payment?: number | null;
  notes?: string | null;
};

function detailRow(label: string, value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "";
  return `
                <tr>
                  <td style="border:1px solid #ddd;padding:8px;width:40%;vertical-align:top;color:#555">${label}</td>
                  <td style="border:1px solid #ddd;padding:8px">${value}</td>
                </tr>`;
}

export function renderBookingConfirmationHTML(
  payload: ConfirmBookingEmailPayload
) {
  const customer_name = escapeHtml(payload.customer_name);
  const hotel_name = escapeHtml(payload.hotel_name);
  const booking_code = escapeHtml(payload.booking_code);
  const check_in = escapeHtml(payload.check_in);
  const check_out = escapeHtml(payload.check_out);
  const hotline = escapeHtml(payload.hotline);
  const support_email = escapeHtml(payload.support_email);

  const branch_name = payload.branch_name
    ? escapeHtml(payload.branch_name)
    : "";
  const hotel_address = payload.hotel_address
    ? escapeHtml(payload.hotel_address)
    : "";

  // room_type may be multi-line: one room per line, e.g. "Deluxe (301)\nSuite (302)"
  const roomLabel =
    escapeHtml(payload.room_type?.trim() || "-").replaceAll("\n", "<br/>") ||
    "-";

  const stayParts: string[] = [];
  if (payload.number_of_nights != null && payload.number_of_nights > 0) {
    stayParts.push(`${payload.number_of_nights} đêm`);
  }
  if (payload.total_guests != null && payload.total_guests > 0) {
    stayParts.push(`${payload.total_guests} khách`);
  }
  const staySummary = stayParts.join(" · ");

  const phone = "+84 7879 13388";
  const zalo = "+84 786 456 469";

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
                Đặt phòng đã được xác nhận. Thông tin chi tiết:
              </p>

              <table width="100%" style="border-collapse:collapse;margin:16px 0">
                ${detailRow("Mã đặt phòng", `<strong>${booking_code}</strong>`)}
                ${detailRow("Chi nhánh", branch_name)}
                ${detailRow("Địa chỉ", hotel_address)}
                ${detailRow("Phòng", roomLabel)}
                ${detailRow("Nhận phòng", check_in)}
                ${detailRow("Trả phòng", check_out)}
                ${detailRow("Thời gian lưu trú", staySummary)}
                ${detailRow(
                  "Tổng tiền",
                  `<strong>${formatCurrencyVND(payload.total_price)}</strong>`
                )}
              </table>

              <p>
                📞 Hotline: ${hotline}<br/>
                ☎️ Điện thoại: ${phone}<br/>
                💬 Zalo/WhatsApp: ${zalo}<br/>
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

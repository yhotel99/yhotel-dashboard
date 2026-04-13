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
};

export function renderBookingConfirmationHTML(
  payload: ConfirmBookingEmailPayload
) {
  const customer_name = escapeHtml(payload.customer_name);
  const hotel_name = escapeHtml(payload.hotel_name);
  const booking_code = escapeHtml(payload.booking_code);
  const room_type = escapeHtml(payload.room_type);
  const check_in = escapeHtml(payload.check_in);
  const check_out = escapeHtml(payload.check_out);
  const hotline = escapeHtml(payload.hotline);
  const support_email = escapeHtml(payload.support_email);

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
                  <td style="border:1px solid #ddd;padding:8px"><strong>${formatCurrencyVND(payload.total_price)}</strong></td>
                </tr>
              </table>

              <p>
                📞 Hotline: ${hotline}<br/>
                ☎️ Điện thoại: ${phone}<br/>
                💬 Zalo/whatsapp: ${zalo}<br/>
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

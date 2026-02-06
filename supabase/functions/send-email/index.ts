import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
function formatDateTimePretty(isoString) {
  const date = new Date(isoString);
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const h = local.getUTCHours().toString().padStart(2, "0");
  const m = local.getUTCMinutes().toString().padStart(2, "0");
  const d = local.getUTCDate().toString().padStart(2, "0");
  const mo = (local.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = local.getUTCFullYear();
  return `⏰ ${h}:${m} | 📅 ${d}/${mo}/${y}`;
}
Deno.serve(async (req)=>{
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405
      });
    }
    if (!RESEND_API_KEY) {
      return new Response("Missing RESEND_API_KEY", {
        status: 500
      });
    }
    const payload = await req.json();
    const html = `
      <div style="font-family: Arial; line-height: 1.6;">
        <h2>🎉 Xác nhận đặt phòng thành công</h2>

        <p>Xin chào <strong>${payload.customer_name}</strong>,</p>

        <h3>📌 Thông tin đặt phòng</h3>
        <ul>
          <li><strong>🔑 Mã:</strong> ${payload.booking_code}</li>
          <li><strong>🏨 Phòng:</strong> ${payload.room_name}</li>
          <li><strong>📥 Check-in:</strong> ${formatDateTimePretty(payload.check_in)}</li>
          <li><strong>📤 Check-out:</strong> ${formatDateTimePretty(payload.check_out)}</li>
        </ul>

        <p>Trân trọng,<br/><strong>YHotel Booking Team</strong></p>
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
          payload.customer_email
        ],
        subject: `Xác nhận đặt phòng – ${payload.booking_code}`,
        html
      })
    });
    if (!resend.ok) {
      const err = await resend.text();
      return new Response(err, {
        status: 500
      });
    }
    return new Response(JSON.stringify({
      success: true
    }));
  } catch (err) {
    console.error(err);
    return new Response("Internal error", {
      status: 500
    });
  }
});

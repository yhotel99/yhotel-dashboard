import "jsr:@supabase/functions-js/edge-runtime.d.ts";
console.info("confirm_booking function started");
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
    const { customer_name, customer_email, booking_code, room_name, check_in, check_out } = body;
    if (!customer_name || !customer_email || !booking_code || !room_name || !check_in || !check_out) {
      return new Response(JSON.stringify({
        error: "Missing required fields"
      }), {
        status: 400
      });
    }
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({
        error: "Missing RESEND_API_KEY"
      }), {
        status: 500
      });
    }
    const html = `
      <div style="font-family: Arial; line-height: 1.6;">
        <h2>🎉 Xác nhận đặt phòng thành công</h2>
        <p>Xin chào <strong>${customer_name}</strong>,</p>
        <p>Cảm ơn bạn đã đặt phòng tại chúng tôi.</p>

        <h3>Thông tin đặt phòng</h3>
        <ul>
          <li><strong>Mã đặt phòng:</strong> ${booking_code}</li>
          <li><strong>Loại phòng:</strong> ${room_name}</li>
          <li><strong>Check-in:</strong> ${check_in}</li>
          <li><strong>Check-out:</strong> ${check_out}</li>
        </ul>

        <p>Chúng tôi sẽ liên hệ nếu cần thêm thông tin.</p>

        <p>Trân trọng,</p>
        <p><strong>Y99 Booking Team</strong></p>
      </div>
    `;
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Y99 Booking <hello@yhotel.vn>",
        to: [
          customer_email
        ],
        subject: `Xác nhận đặt phòng – Mã ${booking_code}`,
        html
      })
    });
    const result = await resendRes.json();
    if (!resendRes.ok) {
      console.error(result);
      return new Response(JSON.stringify({
        error: "Resend API error",
        result
      }), {
        status: 500
      });
    }
    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500
    });
  }
});

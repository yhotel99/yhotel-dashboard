import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkPermission } from "@/services/permissions";
import { getBookingRegistrationData } from "@/services/bookings";
import { generateRegistrationPdfBuffer } from "@/lib/booking-registration/generate-registration-pdf";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** @react-pdf cần Node.js runtime, không chạy trên Edge */
export const runtime = "nodejs";

/** PDF render có thể chậm ở cold start trên Vercel */
export const maxDuration = 30;

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookingId = id?.trim();

    if (!bookingId) {
      return NextResponse.json({ error: "Thiếu mã booking" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile?.role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hasPermission = await checkPermission(
      profile.role,
      "view",
      "bookings",
      supabase
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await getBookingRegistrationData(bookingId);

    if (!formData) {
      return NextResponse.json(
        { error: "Không tìm thấy booking" },
        { status: 404 }
      );
    }

    const buffer = await generateRegistrationPdfBuffer(formData);

    const filename = `giay-dang-ky-${formData.bookingCode}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating registration PDF:", error);
    return NextResponse.json(
      { error: "Không thể tạo PDF" },
      { status: 500 }
    );
  }
}

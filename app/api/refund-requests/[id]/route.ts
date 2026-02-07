import { NextRequest, NextResponse } from "next/server";
import { getRefundRequestById } from "@/services/refund-requests";

/**
 * GET /api/refund-requests/[id]
 * Chi tiết 1 yêu cầu hoàn tiền (đủ thông tin + tên phòng từ booking_rooms).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Thiếu id yêu cầu hoàn tiền" },
        { status: 400 }
      );
    }

    const refund = await getRefundRequestById(id);
    if (!refund) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu hoàn tiền" },
        { status: 404 }
      );
    }

    return NextResponse.json(refund);
  } catch (err) {
    console.error("Error fetching refund request detail:", err);
    return NextResponse.json(
      { error: "Không thể tải chi tiết yêu cầu hoàn tiền" },
      { status: 500 }
    );
  }
}

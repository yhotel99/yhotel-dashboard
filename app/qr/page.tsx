"use client";

import { useEffect, useState } from "react";
import { BANK_ACCOUNT } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { createClient } from "@/lib/supabase/client";

type QRDisplayData = {
  booking_id: string;
  booking_code: string;
  customer_name: string | null;
  room_name: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  updated_at: string;
};

export default function QRDisplayPage() {
  const [displayData, setDisplayData] = useState<QRDisplayData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    // Subscribe to realtime changes only
    const channel = supabase
      .channel("qr_display_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qr_display_state",
        },
        (payload) => {
          console.log({payload})
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setDisplayData(payload.new as QRDisplayData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!mounted) {
    return null;
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-8">
      <div className="flex flex-col items-center gap-8">
        {displayData ? (
          <>
            <div className="rounded-2xl bg-white p-8 shadow-2xl">
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold text-gray-800">
                  Thanh toán đặt phòng
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Mã booking: <span className="font-semibold text-blue-600">{displayData.booking_code}</span>
                </p>
              </div>

              <div className="mb-6 flex justify-center">
                <img
                  src={`https://qr.sepay.vn/img?acc=${BANK_ACCOUNT.ACC}&bank=${BANK_ACCOUNT.BANK}&amount=${displayData.total_amount}&des=${encodeURIComponent(displayData.booking_code)}&template=compact`}
                  alt="QR Code thanh toán"
                  className="h-80 w-80 rounded-lg shadow-md"
                />
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Khách hàng:</span>
                  <span className="font-semibold text-gray-800">
                    {displayData.customer_name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số phòng:</span>
                  <span className="font-semibold text-gray-800">
                    {displayData.room_name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDateOnly(displayData.check_in)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDateOnly(displayData.check_out)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3">
                  <span className="text-lg font-semibold text-gray-800">Tổng tiền:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(displayData.total_amount)}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <p className="text-center text-sm text-gray-700">
                  <span className="font-semibold">Ngân hàng:</span> {BANK_ACCOUNT.BANK}
                </p>
                <p className="text-center text-sm text-gray-700">
                  <span className="font-semibold">Số tài khoản:</span> {BANK_ACCOUNT.ACC}
                </p>
                <p className="text-center text-sm text-gray-700">
                  <span className="font-semibold">Chủ tài khoản:</span> {BANK_ACCOUNT.ACCOUNT_NAME}
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xl font-semibold text-white">
                Quét mã QR để thanh toán
              </p>
              <p className="mt-2 text-sm text-blue-200">
                Nội dung chuyển khoản: {displayData.booking_code}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="h-32 w-32 animate-pulse rounded-full bg-blue-700" />
            </div>
            <p className="text-2xl font-semibold text-white">
              Chưa có mã QR nào được hiển thị
            </p>
            <p className="mt-2 text-blue-300">
              Vui lòng chọn "Hiển thị mã QR" từ danh sách booking
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

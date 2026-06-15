"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BRANCH_CODE, PUBLIC_ASSETS } from "@/lib/constants";
import {
  bankMissingMessage,
  resolveBankInfo,
  type BankInfoForQr,
} from "@/lib/bank-info";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { buildSepayQrImageUrl } from "@/lib/payment-qr";
import { PaymentQrImage } from "@/components/payment-qr-image";
import { createClient } from "@/lib/supabase/client";

function playPaymentSuccessSound() {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(PUBLIC_ASSETS.PAYMENT_SOUND_APPLE);
    audio.currentTime = 0;
    audio.volume = 1;
    void audio.play().catch(() => { });
  } catch {
    // ignore
  }
}

type QRDisplayData = {
  booking_id: string;
  booking_code: string;
  customer_name: string | null;
  room_name: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  final_amount?: number | null;
  updated_at: string;
  branch_id: string;
};

type BranchInfo = {
  id: string;
  code: string;
  name: string;
};

type PublicQrInitResponse = {
  branch: BranchInfo;
  bank: {
    bank_account_number: string | null;
    bank_name: string | null;
    bank_code: string | null;
    bank_account_owner: string | null;
  };
  display: QRDisplayData | null;
};

export function QRDisplayScreen({ branchCode }: { branchCode: string }) {
  const normalizedCode = branchCode.trim().toLowerCase();
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [bank, setBank] = useState<BankInfoForQr | null>(null);
  const [displayData, setDisplayData] = useState<QRDisplayData | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const playedSuccessSoundRef = useRef(false);

  const applyBankForBranch = useCallback(
    (branchInfo: BranchInfo, bankFields: PublicQrInitResponse["bank"]) => {
      const bankInfo = resolveBankInfo(bankFields);
      if (!bankInfo) {
        setLoadError(bankMissingMessage(branchInfo.name));
        setBank(null);
        return false;
      }
      setBank(bankInfo);
      return true;
    },
    []
  );

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    const supabase = createClient();
    let removeChannel: (() => void) | undefined;
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`/api/public/qr-display/${normalizedCode}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (!cancelled) {
            setLoadError(
              body.error ??
                `Không tìm thấy chi nhánh "${normalizedCode}". Kiểm tra URL (ví dụ: /qr/main).`
            );
          }
          return;
        }

        const payload = (await res.json()) as PublicQrInitResponse;
        if (cancelled) return;

        setBranch(payload.branch);
        setLoadError(null);

        if (!applyBankForBranch(payload.branch, payload.bank)) {
          return;
        }

        if (payload.display) {
          setDisplayData(payload.display);
        }

        const channel = supabase
          .channel(`qr_display_${payload.branch.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "qr_display_state",
              filter: `branch_id=eq.${payload.branch.id}`,
            },
            (changePayload) => {
              if (
                changePayload.eventType === "INSERT" ||
                changePayload.eventType === "UPDATE"
              ) {
                setDisplayData(changePayload.new as QRDisplayData);
                setPaymentSuccess(false);
              }
            }
          )
          .subscribe();

        removeChannel = () => {
          supabase.removeChannel(channel);
        };
      } catch {
        if (!cancelled) {
          setLoadError("Không thể tải dữ liệu màn hình QR. Vui lòng thử lại.");
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      removeChannel?.();
    };
  }, [applyBankForBranch, normalizedCode]);

  useEffect(() => {
    if (!displayData?.booking_id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`booking_${displayData.booking_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${displayData.booking_id}`,
        },
        (payload) => {
          const next = payload.new as { status?: string };
          if (next?.status === "confirmed") {
            setPaymentSuccess(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [displayData?.booking_id]);

  useEffect(() => {
    if (!displayData) return;
    const timeoutId = setTimeout(() => {
      setDisplayData(null);
      setPaymentSuccess(false);
    }, 5 * 60 * 1000);
    return () => clearTimeout(timeoutId);
  }, [displayData]);

  useEffect(() => {
    if (!paymentSuccess) {
      playedSuccessSoundRef.current = false;
      return;
    }
    if (!playedSuccessSoundRef.current) {
      playPaymentSuccessSound();
      playedSuccessSoundRef.current = true;
    }
  }, [paymentSuccess]);

  useEffect(() => {
    if (!paymentSuccess) return;
    const timeoutId = setTimeout(() => {
      setDisplayData(null);
      setPaymentSuccess(false);
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, [paymentSuccess]);

  if (!mounted) {
    return null;
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1a0f] p-8 text-center">
        <p className="text-xl text-red-300">{loadError}</p>
        <p className="mt-4 text-[#9bc78e]">
          URL mẫu: /qr/{DEFAULT_BRANCH_CODE}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1a0f] p-8">
      {branch && (
        <p className="mb-4 text-center text-sm text-[#9bc78e]/80">
          {branch.name}
        </p>
      )}
      {paymentSuccess ? (
        <div className="flex flex-col items-center justify-center text-center px-4">
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @keyframes qr-success-scale {
              0% { transform: scale(0); opacity: 0; }
              55% { transform: scale(1.08); opacity: 1; }
              75% { transform: scale(0.96); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes qr-success-circle {
              to { stroke-dashoffset: 0; }
            }
            @keyframes qr-success-check {
              to { stroke-dashoffset: 0; }
            }
            .qr-success-icon-wrap {
              animation: qr-success-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .qr-success-circle {
              stroke-dasharray: 70;
              stroke-dashoffset: 70;
              animation: qr-success-circle 0.35s ease-out 0.1s forwards;
            }
            .qr-success-check {
              stroke-dasharray: 24;
              stroke-dashoffset: 24;
              animation: qr-success-check 0.3s ease-out 0.35s forwards;
            }
          `,
            }}
          />
          <div className="qr-success-icon-wrap mb-6 flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full bg-[#9bc78e]">
            <svg
              className="h-16 w-16 text-[#0a1a0f]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                className="qr-success-circle"
                cx="12"
                cy="12"
                r="11"
                stroke="currentColor"
                strokeWidth={2.2}
                fill="none"
              />
              <path className="qr-success-check" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">Thanh toán thành công</h2>
          <p className="mt-2 text-lg text-[#9bc78e]">
            Cảm ơn quý khách. Đang quay về màn hình chờ...
          </p>
        </div>
      ) : displayData && bank ? (
        <div className="flex w-full max-w-lg flex-col items-center gap-8">
          <div className="w-full rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-[#0a1a0f]">
                Thanh toán đặt phòng
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Mã booking:{" "}
                <span className="font-semibold text-[#9bc78e]">
                  {displayData.booking_code}
                </span>
              </p>
            </div>

            <div className="mb-6 flex justify-center">
              <PaymentQrImage
                src={buildSepayQrImageUrl({
                  acc: bank.acc,
                  bank: bank.bank,
                  amount: displayData.final_amount ?? displayData.total_amount,
                  description: displayData.booking_code,
                })}
                width={320}
                height={320}
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
                <span className="text-lg font-semibold text-gray-800">
                  Số tiền thanh toán cuối cùng:
                </span>
                <span className="text-lg font-bold text-[#9bc78e]">
                  {formatCurrency(
                    displayData.final_amount ?? displayData.total_amount
                  )}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-[#9bc78e]/30 bg-[#9bc78e]/10 p-4">
              <p className="text-center text-sm text-gray-700">
                <span className="font-semibold">Ngân hàng:</span> {bank.bankLabel}
              </p>
              <p className="text-center text-sm text-gray-700">
                <span className="font-semibold">Số tài khoản:</span> {bank.acc}
              </p>
              <p className="text-center text-sm text-gray-700">
                <span className="font-semibold">Chủ tài khoản:</span>{" "}
                {bank.accountName}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl font-semibold text-white">
              Quét mã QR để thanh toán
            </p>
            <p className="mt-2 text-sm text-[#9bc78e]">
              Nội dung chuyển khoản: {displayData.booking_code}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center px-4">
          <div className="relative w-[32rem] h-[32rem] mx-auto -mb-16 sm:w-[36rem] sm:h-[36rem]">
            <Image
              src={PUBLIC_ASSETS.LOGO}
              alt="Y HOTEL"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex justify-center gap-2">
            <div
              className="w-3 h-3 rounded-full animate-bounce bg-[#9bc78e]"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce bg-[#9bc78e]"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce bg-[#9bc78e]"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
  BookingRecord,
  BookingRoomDetail,
  PaymentWithBooking,
  PaymentsResponse,
} from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { StatusBadge } from "@/components/bookings/status";
import {
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  DollarSignIcon,
  ClockIcon,
  PhoneIcon,
  Building2,
} from "lucide-react";
import { useBranch } from "@/contexts/branch-context";
import { resolveBranchDisplay } from "@/lib/branch";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PAYMENT_TYPE } from "@/lib/constants";
import { buildSepayQrImageUrl } from "@/lib/payment-qr";
import { PaymentQrImage } from "@/components/payment-qr-image";
import { PaymentStatusBadge } from "@/components/payments/status";
import type { Room } from "@/lib/types";
import { getBookingRoomDetailsAction } from "@/actions/bookings";
import { getRoomsByIds } from "@/actions/rooms";
import { useSettings } from "@/hooks/use-settings";
import { useBranchBankAccounts } from "@/hooks/use-branch-bank-accounts";
import { DEFAULT_BRANCH_ID } from "@/lib/constants";
import {
  calculateTotalWithWeekdayRates,
  normalizeHolidayPeriods,
  normalizeWeekdayRates,
} from "@/lib/pricing";

interface BookingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord | null;
}

export function BookingDetailDialog({
  open,
  onOpenChange,
  booking,
}: BookingDetailDialogProps) {
  const bookingId = booking?.id ?? null;
  const paymentsUrl =
    open && bookingId
      ? `/api/payments?bookingId=${bookingId}&page=1&limit=20`
      : null;

  const { data: paymentsResponse, isLoading: isPaymentsLoading } =
    useSWR<PaymentsResponse>(paymentsUrl, fetcher, {
      revalidateOnFocus: false,
    });

  const { data: bookingRoomDetails = [], isLoading: isBookingRoomsLoading } =
    useSWR<BookingRoomDetail[]>(
      open && bookingId ? ["booking-room-details", bookingId] : null,
      async () => {
        const result = await getBookingRoomDetailsAction(bookingId!);
        if (result.ok) return result.data;
        throw new Error(result.message);
      },
      { revalidateOnFocus: false }
    );

  const roomIds = booking?.rooms?.items?.map((item) => item.id) ?? [];
  const detailRoomIds = bookingRoomDetails.map((br) => br.room_id);
  const allRoomIds = [...roomIds, ...detailRoomIds].filter(
    (id, index, arr) => arr.indexOf(id) === index
  );

  const { data: roomsData, isLoading: isRoomLoading } = useSWR<Room[]>(
    open && allRoomIds.length > 0 ? ["rooms", ...allRoomIds] : null,
    async () => {
      const result = await getRoomsByIds(allRoomIds);
      if (result.ok) {
        return result.data;
      }
      throw new Error(result.message);
    },
    {
      revalidateOnFocus: false,
    }
  );

  const payments = paymentsResponse?.data ?? [];

  const getLatestPaymentByType = (paymentType: string): PaymentWithBooking | null => {
    const matched = payments.filter((p) => p.payment_type === paymentType);
    if (matched.length === 0) return null;
    return matched.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]!;
  };

  const advancePayment = getLatestPaymentByType(PAYMENT_TYPE.ADVANCE_PAYMENT);
  const roomChargePayment = getLatestPaymentByType(PAYMENT_TYPE.ROOM_CHARGE);
  const { settings } = useSettings();
  const { getBankInfo } = useBranchBankAccounts();
  const { branches } = useBranch();

  const branchDisplay = useMemo(() => {
    if (!booking) return { name: "—", code: "—" };
    return resolveBranchDisplay(booking.branch_id, branches);
  }, [booking, branches]);

  const roomAmountById = useMemo(() => {
    const map = new Map<string, number>();
    for (const br of bookingRoomDetails) {
      if (br.room_id && br.amount != null && Number(br.amount) > 0) {
        map.set(br.room_id, Number(br.amount));
      }
    }
    return map;
  }, [bookingRoomDetails]);

  const getRoomAmount = (roomId: string): number | null => {
    const amount = roomAmountById.get(roomId);
    if (amount != null) return amount;
    if (allRoomIds.length === 1 && allRoomIds[0] === roomId) {
      return booking?.total_amount ?? null;
    }
    return null;
  };

  const pricingBreakdown = useMemo(() => {
    if (!booking || !roomsData || roomsData.length === 0) return [];

    const checkInDate = booking.check_in.split("T")[0] ?? "";
    const checkOutDate = booking.check_out.split("T")[0] ?? "";
    if (!checkInDate || !checkOutDate) return [];

    const nightlyBaseTotal = roomsData.reduce(
      (sum, room) => sum + Number(room.price_per_night || 0),
      0
    );
    if (!Number.isFinite(nightlyBaseTotal) || nightlyBaseTotal <= 0) return [];

    const weekdayRates = normalizeWeekdayRates(
      settings?.pricing_weekday_rates ?? undefined
    );
    const holidayPeriods = normalizeHolidayPeriods(
      settings?.pricing_holiday_periods
    );

    return calculateTotalWithWeekdayRates({
      basePrice: nightlyBaseTotal,
      checkInDate,
      checkOutDate,
      weekdayRates,
      holidayPeriods,
    }).breakdown;
  }, [booking, roomsData, settings?.pricing_weekday_rates, settings?.pricing_holiday_periods]);

  const bankInfo = useMemo(() => {
    if (!booking) return null;
    return getBankInfo(booking.branch_id ?? DEFAULT_BRANCH_ID);
  }, [booking, getBankInfo]);

  const bookingQrImageUrl = useMemo(() => {
    if (!bankInfo || !booking) return null;
    const amount = booking.final_amount ?? booking.total_amount;
    if (!amount || amount <= 0) return null;
    return buildSepayQrImageUrl({
      acc: bankInfo.acc,
      bank: bankInfo.bank,
      amount,
      description: booking.booking_code,
    });
  }, [bankInfo, booking]);

  if (!booking) return null;

  const finalAmount = booking.final_amount ?? booking.total_amount;
  const amountDifference = booking.total_amount - finalAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl!">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Chi tiết booking
            <Badge variant="outline" className="font-semibold">
              {booking.booking_code}
            </Badge>
            <StatusBadge status={booking.status} />
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về booking
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4 scrollbar-hide">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="size-5" />
                Chi nhánh
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <p className="text-sm text-muted-foreground">Tên chi nhánh</p>
                  <p className="font-medium">{branchDisplay.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mã chi nhánh</p>
                  <p className="font-medium font-mono">{branchDisplay.code}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserIcon className="size-5" />
                Thông tin khách hàng
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <p className="text-sm text-muted-foreground">Họ tên</p>
                  <p className="font-medium">
                    {booking.customers?.full_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số điện thoại</p>
                  <p className="font-medium flex items-center gap-1">
                    <PhoneIcon className="size-4" />
                    {booking.customers?.phone || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Room Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPinIcon className="size-5" />
                Thông tin phòng {allRoomIds.length > 1 && `(${allRoomIds.length} phòng)`}
              </h3>
              {isRoomLoading || isBookingRoomsLoading ? (
                <div className="pl-7 text-sm text-muted-foreground">
                  Đang tải thông tin phòng...
                </div>
              ) : roomsData && roomsData.length > 0 ? (
                <div className="pl-7 space-y-4">
                  {roomsData.map((room, index) => {
                    const roomAmount = getRoomAmount(room.id);
                    return (
                      <div key={room.id} className="space-y-2">
                        {roomsData.length > 1 && (
                          <p className="text-sm font-semibold text-muted-foreground">
                            Phòng {index + 1}
                          </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Tên phòng</p>
                            <p className="font-medium">{room.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Số phòng</p>
                            <p className="font-medium">{room.room_number || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Số tầng</p>
                            <p className="font-medium">
                              {room.floor_number !== null && room.floor_number !== undefined
                                ? `Tầng ${room.floor_number}`
                                : "-"}
                            </p>
                          </div>
                          {roomAmount != null ? (
                            <div>
                              <p className="text-sm text-muted-foreground">Tổng tiền phòng</p>
                              <p className="font-medium text-green-600">
                                {formatCurrency(roomAmount)}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        {index < roomsData.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : bookingRoomDetails.length > 0 ? (
                <div className="pl-7 space-y-4">
                  {bookingRoomDetails.map((br, index) => {
                    const roomAmount = getRoomAmount(br.room_id);
                    return (
                      <div key={br.room_id} className="space-y-2">
                        {bookingRoomDetails.length > 1 && (
                          <p className="text-sm font-semibold text-muted-foreground">
                            Phòng {index + 1}
                          </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Tên phòng</p>
                            <p className="font-medium">{br.rooms.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Số phòng</p>
                            <p className="font-medium">{br.rooms.room_number || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Số tầng</p>
                            <p className="font-medium">
                              {br.rooms.floor_number !== null && br.rooms.floor_number !== undefined
                                ? `Tầng ${br.rooms.floor_number}`
                                : "-"}
                            </p>
                          </div>
                          {roomAmount != null ? (
                            <div>
                              <p className="text-sm text-muted-foreground">Tổng tiền phòng</p>
                              <p className="font-medium text-green-600">
                                {formatCurrency(roomAmount)}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        {index < bookingRoomDetails.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : booking?.rooms?.items && booking.rooms.items.length > 0 ? (
                <div className="pl-7">
                  <p className="text-sm text-muted-foreground">Danh sách phòng</p>
                  <div className="space-y-1 mt-1">
                    {booking.rooms.items.map((item, index) => {
                      const roomAmount = getRoomAmount(item.id);
                      return (
                        <p key={item.id} className="font-medium">
                          {index + 1}. {item.name}
                          {roomAmount != null ? (
                            <span className="text-green-600 ml-2">
                              ({formatCurrency(roomAmount)})
                            </span>
                          ) : null}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="pl-7">
                  <p className="text-sm text-muted-foreground">Chưa có thông tin phòng</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Booking Dates */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarIcon className="size-5" />
                Thời gian lưu trú
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {formatDateOnly(booking.check_in)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {formatDateOnly(booking.check_out)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số đêm</p>
                  <p className="font-medium">{booking.number_of_nights} đêm</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số khách</p>
                  <p className="font-medium">{booking.total_guests} người</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actual Check-in/Out (if available) */}
            {(booking.actual_check_in || booking.actual_check_out) && (
              <>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ClockIcon className="size-5" />
                    Thời gian thực tế
                  </h3>
                  <div className="grid grid-cols-2 gap-4 pl-7">
                    {booking.actual_check_in && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Check-in thực tế
                        </p>
                        <p className="font-medium">
                          {formatDateOnly(booking.actual_check_in)}
                        </p>
                      </div>
                    )}
                    {booking.actual_check_out && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Check-out thực tế
                        </p>
                        <p className="font-medium">
                          {formatDateOnly(booking.actual_check_out)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Payment Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSignIcon className="size-5" />
                Thông tin thanh toán
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng tiền gốc</p>
                  <p className="font-medium">
                    {formatCurrency(booking.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Số tiền thanh toán cuối cùng
                  </p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(finalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tiền đặt cọc</p>
                  <p className="font-medium text-blue-600">
                    {formatCurrency(booking.advance_payment)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Chênh lệch (gốc − cuối)
                  </p>
                  <p
                    className={`font-medium ${amountDifference > 0
                        ? "text-orange-600"
                        : amountDifference < 0
                          ? "text-red-600"
                          : ""
                      }`}
                  >
                    {formatCurrency(amountDifference)}
                  </p>
                </div>
              </div>

              {pricingBreakdown.length > 0 && (
                <div className="pl-7 mt-4">
                  <p className="text-sm font-semibold mb-2">Chi tiết giá từng ngày</p>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-12 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                      <div className="col-span-4">Ngày</div>
                      <div className="col-span-2 text-right">% áp dụng</div>
                      <div className="col-span-3 text-right">Giá / đêm</div>
                      <div className="col-span-3">Ghi chú</div>
                    </div>
                    {pricingBreakdown.map((d) => (
                      <div
                        key={d.date}
                        className="grid grid-cols-12 items-center border-t px-3 py-2 text-sm"
                      >
                        <div className="col-span-4 font-medium">
                          {formatDateOnly(`${d.date}T00:00:00`)}
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          +{d.percent}%
                        </div>
                        <div className="col-span-3 text-right">
                          {formatCurrency(d.price)}
                        </div>
                        <div className="col-span-3 text-xs text-muted-foreground">
                          {d.holiday_label ? `Lễ: ${d.holiday_label}` : "Theo thứ"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Code Payment */}
              {bankInfo && bookingQrImageUrl ? (
                <div className="pl-7 mt-4">
                  <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* QR Code */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-white p-3 rounded-lg shadow-md">
                          <PaymentQrImage
                            src={bookingQrImageUrl}
                            width={192}
                            height={192}
                            className="size-48"
                            unoptimized
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground max-w-[200px]">
                          Quét mã QR để thanh toán
                        </p>
                      </div>

                      {/* Bank Info */}
                      <div className="flex-1 space-y-3">
                        <h4 className="font-semibold text-base">Thông tin chuyển khoản</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-sm text-muted-foreground min-w-[100px]">Ngân hàng:</span>
                            <span className="font-medium">{bankInfo.bankLabel}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-sm text-muted-foreground min-w-[100px]">Số tài khoản:</span>
                            <span className="font-mono font-bold text-lg">{bankInfo.acc}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-sm text-muted-foreground min-w-[100px]">Chủ tài khoản:</span>
                            <span className="font-medium">{bankInfo.accountName}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-sm text-muted-foreground min-w-[100px]">Số tiền:</span>
                            <span className="font-bold text-green-600 text-lg">
                              {formatCurrency(booking.final_amount ?? booking.total_amount)}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-sm text-muted-foreground min-w-[100px]">Nội dung:</span>
                            <span className="font-mono font-bold text-blue-600">
                              {booking.booking_code}
                            </span>
                          </div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3 mt-4">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            ⚠️ Lưu ý: Vui lòng nhập đúng nội dung chuyển khoản để hệ thống tự động xác nhận thanh toán
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {(isPaymentsLoading || roomChargePayment || advancePayment) && (
                <div className="pl-7 space-y-3 mt-4">
                  {/* Trạng thái tiền phòng */}
                  {isPaymentsLoading ? (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            Trạng thái tiền phòng
                          </p>
                          <p className="text-base font-bold text-blue-700 dark:text-blue-300">
                            Đang tải...
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Badge variant="outline" className="whitespace-nowrap bg-white dark:bg-gray-900">
                            Đang tải...
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    roomChargePayment && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                              Trạng thái tiền phòng
                            </p>
                            <p className="text-base font-bold text-blue-700 dark:text-blue-300">
                              {formatCurrency(roomChargePayment.amount)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <PaymentStatusBadge status={roomChargePayment.payment_status} />
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Trạng thái tiền cọc */}
                  {isPaymentsLoading ? (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Trạng thái tiền cọc
                          </p>
                          <p className="text-base font-bold text-amber-700 dark:text-amber-300">
                            Đang tải...
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Badge variant="outline" className="whitespace-nowrap bg-white dark:bg-gray-900">
                            Đang tải...
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    advancePayment && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                              Trạng thái tiền cọc
                            </p>
                            <p className="text-base font-bold text-amber-700 dark:text-amber-300">
                              {formatCurrency(advancePayment.amount)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <PaymentStatusBadge status={advancePayment.payment_status} />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Thời gian hệ thống</h3>
              <div className="grid grid-cols-2 gap-4 pl-7 text-sm">
                <div>
                  <p className="text-muted-foreground">Tên người tạo</p>
                  <p className="font-medium">
                    {booking.created_by_profile?.full_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">ID người tạo</p>
                  <p className="font-medium">{booking.created_by || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ngày tạo</p>
                  <p className="font-medium">
                    {formatDateOnly(booking.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cập nhật lần cuối</p>
                  <p className="font-medium">
                    {formatDateOnly(booking.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />
          {/* Notes - displayed prominently after status */}
          {booking.notes && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                📝 Ghi chú
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {booking.notes}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

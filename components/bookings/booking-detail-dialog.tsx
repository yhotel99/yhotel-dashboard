"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { BookingRecord, PaymentWithBooking, PaymentsResponse } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { StatusBadge } from "@/components/bookings/status";
import {
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  DollarSignIcon,
  ClockIcon,
  PhoneIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { BANK_ACCOUNT, PAYMENT_TYPE } from "@/lib/constants";
import { PaymentStatusBadge } from "@/components/payments/status";
import type { Room } from "@/lib/types";
import { getRoomsByIds } from "@/actions/rooms";

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

  // Fetch room data separately for all rooms in booking
  const roomIds = booking?.rooms?.items?.map(item => item.id) ?? [];
  
  // For multi-room bookings, get room IDs from booking_rooms
  const multiRoomIds = booking?.booking_rooms?.map(br => br.room_id) ?? [];
  
  // Combine both sources of room IDs
  const allRoomIds = [...roomIds, ...multiRoomIds].filter((id, index, arr) => arr.indexOf(id) === index);

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

  if (!booking) return null;

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
                Thông tin phòng {(allRoomIds.length > 1 || (booking?.booking_rooms && booking.booking_rooms.length > 1)) && `(${Math.max(allRoomIds.length, booking?.booking_rooms?.length || 0)} phòng)`}
              </h3>
              {isRoomLoading ? (
                <div className="pl-7 text-sm text-muted-foreground">
                  Đang tải thông tin phòng...
                </div>
              ) : roomsData && roomsData.length > 0 ? (
                <div className="pl-7 space-y-4">
                  {roomsData.map((room, index) => (
                    <div key={room.id} className="space-y-2">
                      {roomsData.length > 1 && (
                        <p className="text-sm font-semibold text-muted-foreground">
                          Phòng {index + 1}
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-4">
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
                      </div>
                      {index < roomsData.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              ) : booking?.booking_rooms && booking.booking_rooms.length > 0 ? (
                <div className="pl-7 space-y-4">
                  {booking.booking_rooms.map((br, index) => (
                    <div key={br.room_id} className="space-y-2">
                      {booking.booking_rooms && booking.booking_rooms.length > 1 && (
                        <p className="text-sm font-semibold text-muted-foreground">
                          Phòng {index + 1}
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-4">
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
                      </div>
                      {index < (booking.booking_rooms?.length || 0) - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              ) : booking?.rooms?.items && booking.rooms.items.length > 0 ? (
                <div className="pl-7">
                  <p className="text-sm text-muted-foreground">Danh sách phòng</p>
                  <div className="space-y-1 mt-1">
                    {booking.rooms.items.map((item, index) => (
                      <p key={item.id} className="font-medium">
                        {index + 1}. {item.name}
                      </p>
                    ))}
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
                    {formatCurrency(booking.final_amount ?? booking.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tiền đặt cọc</p>
                  <p className="font-medium text-blue-600">
                    {formatCurrency(booking.advance_payment)}
                  </p>
                </div>
              </div>

              {/* QR Code Payment */}
              <div className="pl-7 mt-4">
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-white p-3 rounded-lg shadow-md">
                        <Image
                          src={`https://qr.sepay.vn/img?acc=${BANK_ACCOUNT.ACC
                            }&bank=${BANK_ACCOUNT.BANK
                            }&amount=${booking.final_amount ?? booking.total_amount
                            }&des=${encodeURIComponent(
                              booking.booking_code
                            )}&template=compact`}
                          alt="QR Code thanh toán"
                          width={192}
                          height={192}
                          className="size-48"
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
                          <span className="font-medium">{BANK_ACCOUNT.BANK}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[100px]">Số tài khoản:</span>
                          <span className="font-mono font-bold text-lg">{BANK_ACCOUNT.ACC}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[100px]">Chủ tài khoản:</span>
                          <span className="font-medium">{BANK_ACCOUNT.ACCOUNT_NAME}</span>
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

import {
  PAYMENT_STATUS,
  REFUND_REQUEST_STATUS,
  REPORTING_STATUS,
} from "@/lib/constants";
import type {
  ReceptionistRevenueReport,
  ReceptionistRevenueRow,
} from "@/app/api/reports/types";

export type CashPaymentRow = {
  booking_id: string | null;
  amount: number | string | null;
  payment_status: string | null;
  reporting_status: string | null;
};

export type CashRefundRow = {
  booking_id: string | null;
  amount: number | string | null;
  status: string | null;
};

export type BookingCreatorRow = {
  id: string;
  created_by: string | null;
};

function parseAmount(value: number | string | null | undefined): number {
  const raw = typeof value === "string" ? Number.parseFloat(value) : value ?? 0;
  return Number.isFinite(raw) ? raw : 0;
}

export function isSuccessfulCashPayment(payment: CashPaymentRow): boolean {
  return (
    payment.payment_status === PAYMENT_STATUS.PAID &&
    payment.reporting_status === REPORTING_STATUS.INCLUDED
  );
}

export function isSuccessfulRefund(refund: CashRefundRow): boolean {
  return refund.status === REFUND_REQUEST_STATUS.REFUNDED;
}

export function netCashAfterRefund(collected: number, refunded: number): number {
  return Math.max(0, collected - refunded);
}

type ProfileInfo = { full_name: string | null; email: string | null };

type Metric = {
  collectedGross: number;
  refundedAmount: number;
  paymentCount: number;
  bookingIds: Set<string>;
};

/**
 * Tiền về túi theo lễ tân (cash basis):
 * - Thu: payment paid+included theo `paid_at` trong kỳ
 * - Trừ: refund status=refunded theo `updated_at` trong kỳ
 * - Gán: booking.created_by
 */
export function buildReceptionistRevenueReport(input: {
  fromDate: string;
  toDate: string;
  payments: CashPaymentRow[];
  refunds: CashRefundRow[];
  bookings: BookingCreatorRow[];
  profiles: Map<string, ProfileInfo>;
}): ReceptionistRevenueReport {
  const creatorByBooking = new Map<string, string | null>();
  for (const booking of input.bookings) {
    creatorByBooking.set(booking.id, booking.created_by ?? null);
  }

  const metrics = new Map<string | null, Metric>();

  const ensure = (userId: string | null): Metric => {
    const current = metrics.get(userId);
    if (current) return current;
    const created: Metric = {
      collectedGross: 0,
      refundedAmount: 0,
      paymentCount: 0,
      bookingIds: new Set(),
    };
    metrics.set(userId, created);
    return created;
  };

  let totalCollectedGross = 0;
  let totalRefundedAmount = 0;

  for (const payment of input.payments) {
    if (!isSuccessfulCashPayment(payment)) continue;
    const amount = parseAmount(payment.amount);
    if (amount <= 0) continue;

    const bookingId = payment.booking_id;
    const userId =
      bookingId && creatorByBooking.has(bookingId)
        ? creatorByBooking.get(bookingId) ?? null
        : null;

    const metric = ensure(userId);
    metric.collectedGross += amount;
    metric.paymentCount += 1;
    if (bookingId) metric.bookingIds.add(bookingId);
    totalCollectedGross += amount;
  }

  for (const refund of input.refunds) {
    if (!isSuccessfulRefund(refund)) continue;
    const amount = parseAmount(refund.amount);
    if (amount <= 0) continue;

    const bookingId = refund.booking_id;
    const userId =
      bookingId && creatorByBooking.has(bookingId)
        ? creatorByBooking.get(bookingId) ?? null
        : null;

    const metric = ensure(userId);
    metric.refundedAmount += amount;
    if (bookingId) metric.bookingIds.add(bookingId);
    totalRefundedAmount += amount;
  }

  const totalNetInPocket = netCashAfterRefund(
    totalCollectedGross,
    totalRefundedAmount
  );

  const rows: ReceptionistRevenueRow[] = Array.from(metrics.entries()).map(
    ([userId, metric]) => {
      const netInPocket = netCashAfterRefund(
        metric.collectedGross,
        metric.refundedAmount
      );
      const bookingCount = metric.bookingIds.size;
      const base = {
        collectedGross: metric.collectedGross,
        refundedAmount: metric.refundedAmount,
        roomRevenueCollected: netInPocket,
        paymentCount: metric.paymentCount,
        bookingCount,
        checkedOutBookings: bookingCount,
        checkedInBookings: bookingCount,
      };

      if (!userId) {
        return {
          userId: null,
          fullName: null,
          email: null,
          ...base,
        };
      }

      const profile = input.profiles.get(userId);
      return {
        userId,
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
        ...base,
      };
    }
  );

  rows.sort((a, b) => b.roomRevenueCollected - a.roomRevenueCollected);

  return {
    fromDate: input.fromDate,
    toDate: input.toDate,
    totalCollectedGross,
    totalRefundedAmount,
    totalRoomRevenueCollected: totalNetInPocket,
    totalCheckedOutBookings: rows.reduce((s, r) => s + r.bookingCount, 0),
    totalPaymentCount: rows.reduce((s, r) => s + r.paymentCount, 0),
    rows,
  };
}

/** @deprecated kept for older scripts — prefer netCashAfterRefund */
export const netRoomRevenueAfterRefund = netCashAfterRefund;
export const sumRoomPaymentsForBooking = (
  payments: CashPaymentRow[]
): number =>
  payments.reduce((sum, payment) => {
    if (!isSuccessfulCashPayment(payment)) return sum;
    return sum + parseAmount(payment.amount);
  }, 0);
export const sumRefundsForBooking = (refunds: CashRefundRow[]): number =>
  refunds.reduce((sum, refund) => {
    if (!isSuccessfulRefund(refund)) return sum;
    return sum + parseAmount(refund.amount);
  }, 0);

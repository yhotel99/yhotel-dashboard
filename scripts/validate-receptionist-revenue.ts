import {
  buildReceptionistRevenueReport,
  netCashAfterRefund,
  sumRefundsForBooking,
  sumRoomPaymentsForBooking,
} from "../lib/reports/receptionist-revenue";
import {
  PAYMENT_STATUS,
  REFUND_REQUEST_STATUS,
  REPORTING_STATUS,
} from "../lib/constants";

const paid = (bookingId: string | null, amount: number) => ({
  booking_id: bookingId,
  amount,
  payment_status: PAYMENT_STATUS.PAID,
  reporting_status: REPORTING_STATUS.INCLUDED,
});

if (sumRoomPaymentsForBooking([paid("b1", 300000), paid("b1", 0)]) !== 300000) {
  throw new Error("payment sum failed");
}
if (
  sumRefundsForBooking([
    { booking_id: "b1", amount: 100000, status: REFUND_REQUEST_STATUS.REFUNDED },
    { booking_id: "b1", amount: 50, status: REFUND_REQUEST_STATUS.PENDING },
  ]) !== 100000
) {
  throw new Error("refund sum failed");
}
if (netCashAfterRefund(300000, 100000) !== 200000) {
  throw new Error("net failed");
}

const report = buildReceptionistRevenueReport({
  fromDate: "2026-01-01",
  toDate: "2026-01-31",
  payments: [
    paid("b1", 300000),
    paid("b2", 700000),
    paid("b3", 50000), // cancelled booking still counts cash-in
  ],
  refunds: [
    {
      booking_id: "b1",
      amount: 100000,
      status: REFUND_REQUEST_STATUS.REFUNDED,
    },
  ],
  bookings: [
    { id: "b1", created_by: "u1" },
    { id: "b2", created_by: "u1" },
    { id: "b3", created_by: "u2" },
  ],
  profiles: new Map([["u1", { full_name: "Lan", email: "lan@test.com" }]]),
});

// u1: 300k+700k - 100k = 900k; u2: 50k; total net 950k
if (report.totalCollectedGross !== 1050000) {
  throw new Error(`gross ${report.totalCollectedGross}`);
}
if (report.totalRefundedAmount !== 100000) {
  throw new Error(`refund ${report.totalRefundedAmount}`);
}
if (report.totalRoomRevenueCollected !== 950000) {
  throw new Error(`net ${report.totalRoomRevenueCollected}`);
}
const u1 = report.rows.find((r) => r.userId === "u1");
if (!u1 || u1.roomRevenueCollected !== 900000 || u1.paymentCount !== 2) {
  throw new Error(`u1 ${JSON.stringify(u1)}`);
}

console.log("receptionist revenue validation passed");

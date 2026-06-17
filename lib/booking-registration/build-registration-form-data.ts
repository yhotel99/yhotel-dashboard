import {
  nationalityLabels,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  paymentMethodLabels,
} from "@/lib/constants";
import type { Branch, BranchBankAccount, Payment, Settings } from "@/lib/types";
import {
  REGISTRATION_AGREEMENT_ITEMS,
  REGISTRATION_BLANK,
  REGISTRATION_BLANK_SHORT,
  REGISTRATION_COMPANY,
  REGISTRATION_DEFAULT_HOTEL,
  REGISTRATION_POLICY_NOTE,
  REGISTRATION_TERMS,
} from "./constants";
import {
  displayOrDash,
  formatAmountPlain,
  formatDocumentNumber,
  formatRegistrationDate,
  formatRegistrationDateParts,
  resolveRegistrationHotelName,
} from "./formatters";
import type {
  RegistrationBookingRaw,
  RegistrationBookingRoomRaw,
  RegistrationFormData,
  RegistrationPaymentMethods,
  RegistrationPaymentOptionRow,
  RegistrationRoomRow,
} from "./types";

function resolveNationalityLabel(code: string | null | undefined): string {
  if (!code?.trim()) return REGISTRATION_BLANK;
  const key = code.trim() as keyof typeof nationalityLabels;
  return nationalityLabels[key] ?? code;
}

function groupRoomRows(
  rooms: RegistrationBookingRoomRaw[],
  fallbackNights: number
): RegistrationRoomRow[] {
  const groups = new Map<
    string,
    { quantity: number; totalAmount: number; nights: number }
  >();

  for (const row of rooms) {
    const roomName = row.rooms?.name?.trim() || "Phòng";
    const nights = row.number_of_nights > 0 ? row.number_of_nights : fallbackNights;
    const amount = Number(row.amount ?? 0);
    const existing = groups.get(roomName);

    if (existing) {
      existing.quantity += 1;
      existing.totalAmount += amount;
      existing.nights = Math.max(existing.nights, nights);
    } else {
      groups.set(roomName, { quantity: 1, totalAmount: amount, nights });
    }
  }

  return Array.from(groups.entries()).map(([roomType, group]) => {
    const ratePerNight =
      group.nights > 0 && group.quantity > 0
        ? group.totalAmount / (group.quantity * group.nights)
        : 0;

    return {
      roomType,
      quantity: group.quantity,
      ratePerNight,
      nights: group.nights,
      amount: group.totalAmount,
    };
  });
}

function buildPaymentMethods(payments: Payment[]): RegistrationPaymentMethods {
  const paid = payments.filter((p) => p.payment_status === PAYMENT_STATUS.PAID);
  const methods = new Set(paid.map((p) => String(p.payment_method)));

  const otherUsed = methods.has(PAYMENT_METHOD.EXTERNAL);

  return {
    cash: methods.has(PAYMENT_METHOD.PAY_AT_HOTEL),
    bankTransfer: methods.has(PAYMENT_METHOD.BANK_TRANSFER),
    creditCard: methods.has(PAYMENT_METHOD.ONEPAY),
    other: otherUsed,
    otherLabel: otherUsed ? paymentMethodLabels[PAYMENT_METHOD.EXTERNAL] : "",
  };
}

const PAYMENT_OPTION_DEFINITIONS = [
  {
    id: "cash",
    method: PAYMENT_METHOD.PAY_AT_HOTEL,
    label: "Tiền mặt / Cash",
    isOther: false,
  },
  {
    id: "bank_transfer",
    method: PAYMENT_METHOD.BANK_TRANSFER,
    label: "Chuyển khoản / Bank Transfer",
    isOther: false,
  },
  {
    id: "credit_card",
    method: PAYMENT_METHOD.ONEPAY,
    label: "Thẻ tín dụng / Credit Card",
    isOther: false,
  },
  {
    id: "other",
    method: PAYMENT_METHOD.EXTERNAL,
    label: "Khác / Other:",
    isOther: true,
  },
] as const;

function buildPaymentOptionRows(payments: Payment[]): RegistrationPaymentOptionRow[] {
  const paid = payments.filter((p) => p.payment_status === PAYMENT_STATUS.PAID);
  const active = payments.filter(
    (p) =>
      p.payment_status !== PAYMENT_STATUS.CANCELLED &&
      p.payment_status !== PAYMENT_STATUS.REFUNDED
  );

  return PAYMENT_OPTION_DEFINITIONS.map((def) => {
    const matchedPaid = paid.filter((p) => String(p.payment_method) === def.method);
    const matchedActive = active.filter(
      (p) => String(p.payment_method) === def.method
    );
    const checked = matchedPaid.length > 0;
    const totalAmount = matchedActive.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const latestPaidAt =
      matchedPaid
        .map((p) => p.paid_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

    return {
      id: def.id,
      label: def.label,
      checked,
      otherSuffix: def.isOther
        ? checked
          ? ` ${paymentMethodLabels[PAYMENT_METHOD.EXTERNAL]}`
          : " ........................................"
        : "",
      amountDisplay: totalAmount > 0 ? formatAmountPlain(totalAmount) : "",
      dateDisplay: latestPaidAt ? formatRegistrationDate(latestPaidAt) : "",
    };
  });
}

export type BuildRegistrationFormInput = {
  booking: RegistrationBookingRaw;
  bookingRooms: RegistrationBookingRoomRaw[];
  payments: Payment[];
  settings: Settings | null;
  branch: Branch | null;
  bankAccount: BranchBankAccount | null;
};

export function buildRegistrationFormData(
  input: BuildRegistrationFormInput
): RegistrationFormData {
  const { booking, bookingRooms, payments, settings, branch, bankAccount } =
    input;

  const customer = booking.customers;
  const paidPayments = payments.filter(
    (p) => p.payment_status === PAYMENT_STATUS.PAID
  );
  const paidAmount = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(booking.final_amount ?? booking.total_amount) || 0;
  const balanceAmount = Math.max(0, totalAmount - paidAmount);

  const hotelName = resolveRegistrationHotelName(branch?.name);
  const hotelAddress =
    branch?.address?.trim() ||
    settings?.contact_address?.trim() ||
    REGISTRATION_DEFAULT_HOTEL.address;
  const hotelPhone =
    branch?.phone?.trim() ||
    settings?.contact_phone?.trim() ||
    REGISTRATION_DEFAULT_HOTEL.phone;
  const hotelEmail =
    settings?.contact_email?.trim() || REGISTRATION_DEFAULT_HOTEL.email;

  const roomRows = groupRoomRows(bookingRooms, booking.number_of_nights || 1);

  return {
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    documentNumber: formatDocumentNumber(booking.booking_code, booking.created_at),
    documentDate: formatRegistrationDate(booking.created_at),
    documentDateParts: formatRegistrationDateParts(booking.created_at),
    companyName: REGISTRATION_COMPANY.name,
    taxId: REGISTRATION_COMPANY.taxId,
    hotelName,
    hotelAddress,
    hotelPhone,
    hotelEmail,
    guestFullName: displayOrDash(customer?.full_name),
    guestNationality: resolveNationalityLabel(customer?.nationality),
    guestIdCard: displayOrDash(customer?.id_card),
    guestDateOfBirth: formatRegistrationDate(customer?.date_of_birth),
    guestPhone: displayOrDash(customer?.phone),
    guestEmail: displayOrDash(customer?.email),
    guestAddress: REGISTRATION_BLANK,
    accompanyingGuests: REGISTRATION_BLANK,
    roomRows,
    checkInDate: formatRegistrationDate(booking.check_in),
    checkOutDate: formatRegistrationDate(booking.check_out),
    checkInParts: formatRegistrationDateParts(booking.check_in),
    checkOutParts: formatRegistrationDateParts(booking.check_out),
    totalAdults: REGISTRATION_BLANK_SHORT,
    totalChildren: REGISTRATION_BLANK_SHORT,
    specialRequests: displayOrDash(booking.notes),
    paymentMethods: buildPaymentMethods(payments),
    paymentOptionRows: buildPaymentOptionRows(payments),
    paymentRows: paidPayments.map((p) => ({
      method: String(p.payment_method),
      methodLabel:
        paymentMethodLabels[
          p.payment_method as keyof typeof paymentMethodLabels
        ] ?? String(p.payment_method),
      amount: Number(p.amount),
      paidAt: p.paid_at,
    })),
    totalAmount,
    paidAmount,
    balanceAmount,
    bankAccountName: displayOrDash(bankAccount?.bank_account_owner),
    bankAccountNumber: displayOrDash(bankAccount?.bank_account_number),
    bankName: displayOrDash(bankAccount?.bank_name),
    terms: REGISTRATION_TERMS,
    agreementItems: REGISTRATION_AGREEMENT_ITEMS,
    policyNote: REGISTRATION_POLICY_NOTE,
  };
}

export { formatAmountPlain, formatRegistrationDateParts };

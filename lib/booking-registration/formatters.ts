import {
  REGISTRATION_BLANK,
  REGISTRATION_BLANK_SHORT,
} from "./constants";

export function formatRegistrationCompanyLine(
  companyName: string,
  taxId: string
): string {
  return `${companyName} - ${taxId}`;
}

export function resolveRegistrationHotelName(
  branchName: string | null | undefined
): string {
  const branch = branchName?.trim();
  return branch ? `Yhotel - ${branch}` : "Yhotel";
}

export function formatPaymentCheckboxMark(checked: boolean): string {
  return checked ? "[x]" : `[\u00A0]`;
}

export function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : REGISTRATION_BLANK;
}

export function formatRegistrationDate(isoString: string | null | undefined): string {
  if (!isoString) return REGISTRATION_BLANK;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return REGISTRATION_BLANK;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatRegistrationDateParts(isoString: string | null | undefined): {
  day: string;
  month: string;
  year: string;
} {
  if (!isoString) {
    return {
      day: REGISTRATION_BLANK_SHORT,
      month: REGISTRATION_BLANK_SHORT,
      year: REGISTRATION_BLANK_SHORT,
    };
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return {
      day: REGISTRATION_BLANK_SHORT,
      month: REGISTRATION_BLANK_SHORT,
      year: REGISTRATION_BLANK_SHORT,
    };
  }
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
}

export function formatAmountPlain(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount));
}

export function formatDocumentNumber(bookingCode: string, createdAt: string): string {
  const year = new Date(createdAt).getFullYear() || new Date().getFullYear();
  return `${bookingCode} - QY/${year}`;
}

import type { Settings } from "@/lib/types";

export type BankSettingsSlice = Pick<
  Settings,
  "bank_account_number" | "bank_name" | "bank_bin" | "bank_account_owner"
>;

export type BankInfoForQr = {
  acc: string;
  /** Mã BIN / ngân hàng dùng cho SePay API */
  bank: string;
  /** Tên ngân hàng hiển thị */
  bankLabel: string;
  accountName: string;
};

/**
 * Lấy thông tin TK ngân hàng từ settings (singleton).
 * Trả về null nếu thiếu bất kỳ trường bắt buộc — không dùng fallback cứng.
 */
export function resolveBankInfoFromSettings(
  settings: BankSettingsSlice | null | undefined
): BankInfoForQr | null {
  if (!settings) return null;

  const acc = settings.bank_account_number?.trim();
  const bankBin = settings.bank_bin?.trim();
  const bankName = settings.bank_name?.trim();
  const accountName = settings.bank_account_owner?.trim();
  const bank = bankBin || bankName;

  if (!acc || !bank || !accountName) return null;

  return {
    acc,
    bank,
    bankLabel: bankName || bankBin || bank,
    accountName,
  };
}

export const BANK_SETTINGS_MISSING_MESSAGE =
  "Chưa cấu hình đủ thông tin ngân hàng trong Cài đặt (số TK, ngân hàng/BIN, chủ tài khoản).";

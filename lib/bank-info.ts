export type BankAccountFields = {
  bank_account_number: string | null;
  bank_name: string | null;
  bank_bin: string | null;
  bank_account_owner: string | null;
};

export type BankInfoForQr = {
  acc: string;
  /** Mã BIN / ngân hàng dùng cho SePay API */
  bank: string;
  /** Tên ngân hàng hiển thị */
  bankLabel: string;
  accountName: string;
};

/**
 * Resolve bank fields for SePay QR. Returns null if required fields are missing.
 */
export function resolveBankInfo(
  fields: BankAccountFields | null | undefined
): BankInfoForQr | null {
  if (!fields) return null;

  const acc = fields.bank_account_number?.trim();
  const bankBin = fields.bank_bin?.trim();
  const bankName = fields.bank_name?.trim();
  const accountName = fields.bank_account_owner?.trim();
  const bank = bankBin || bankName;

  if (!acc || !bank || !accountName) return null;

  return {
    acc,
    bank,
    bankLabel: bankName || bankBin || bank,
    accountName,
  };
}

export function bankMissingMessage(branchName?: string): string {
  if (branchName) {
    return `Chưa cấu hình đủ thông tin ngân hàng cho chi nhánh "${branchName}" (số TK, ngân hàng/BIN, chủ tài khoản).`;
  }
  return "Chưa cấu hình đủ thông tin ngân hàng (số TK, ngân hàng/BIN, chủ tài khoản).";
}

/** @deprecated Use resolveBankInfo */
export function resolveBankInfoFromSettings(
  settings: BankAccountFields | null | undefined
): BankInfoForQr | null {
  return resolveBankInfo(settings);
}

/** @deprecated Use bankMissingMessage */
export const BANK_SETTINGS_MISSING_MESSAGE = bankMissingMessage();

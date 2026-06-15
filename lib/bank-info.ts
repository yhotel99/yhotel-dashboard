import {
  findSepayBank,
  resolveSepayBankParam,
  sepayBanksConflict,
} from "@/lib/sepay-banks";

export type BankAccountFields = {
  bank_account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_account_owner: string | null;
};

export type BankInfoForQr = {
  acc: string;
  /** Mã ngân hàng SePay (code, VD: TPB, MB) */
  bank: string;
  /** Tên ngân hàng hiển thị */
  bankLabel: string;
  accountName: string;
  codeMismatch?: boolean;
};

/**
 * Resolve bank fields for SePay QR.
 * SePay `bank` param dùng code ngân hàng (TPB, MB...) theo tài liệu SePay.
 */
export function resolveBankInfo(
  fields: BankAccountFields | null | undefined
): BankInfoForQr | null {
  if (!fields) return null;

  const acc = fields.bank_account_number?.trim();
  const bankName = fields.bank_name?.trim();
  const bankCode = fields.bank_code?.trim();
  const accountName = fields.bank_account_owner?.trim();
  const bank = resolveSepayBankParam(bankName, bankCode);

  if (!acc || !bank || !accountName) return null;

  const matched = findSepayBank(bankName, bankCode);
  const bankLabel = bankName || matched?.short_name || bank;

  return {
    acc,
    bank,
    bankLabel,
    accountName,
    codeMismatch: sepayBanksConflict(bankName, bankCode),
  };
}

export function bankMissingMessage(branchName?: string): string {
  if (branchName) {
    return `Chưa cấu hình đủ thông tin ngân hàng cho chi nhánh "${branchName}" (số TK, mã ngân hàng, chủ tài khoản).`;
  }
  return "Chưa cấu hình đủ thông tin ngân hàng (số TK, mã ngân hàng, chủ tài khoản).";
}

export function bankCodeMismatchMessage(
  bankName?: string | null,
  bankCode?: string | null
): string | null {
  if (!sepayBanksConflict(bankName, bankCode)) return null;
  const fromCode = bankCode?.trim()
    ? findSepayBank(null, bankCode)
    : null;
  if (fromCode && bankName) {
    return `Mã ngân hàng (${bankCode}) là ${fromCode.short_name} nhưng tên hiển thị là "${bankName}". QR dùng mã ${fromCode.code} — hãy chọn lại ngân hàng cho khớp.`;
  }
  return "Mã ngân hàng không khớp tên. Vui lòng chọn lại từ danh sách.";
}

/** @deprecated Use resolveBankInfo */
export function resolveBankInfoFromSettings(
  settings: BankAccountFields | null | undefined
): BankInfoForQr | null {
  return resolveBankInfo(settings);
}

/** @deprecated Use bankMissingMessage */
export const BANK_SETTINGS_MISSING_MESSAGE = bankMissingMessage();

/** @deprecated Use bankCodeMismatchMessage */
export const bankBinMismatchMessage = bankCodeMismatchMessage;

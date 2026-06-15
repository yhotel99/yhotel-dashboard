/**
 * SePay VietQR bank list — https://qr.sepay.vn/banks.json
 * Tham số `bank` trong URL QR nhận code (TPB, MB...) hoặc short_name.
 * Ưu tiên lưu/dùng `code` theo tài liệu SePay.
 */

export type SepayBank = {
  short_name: string;
  code: string;
  bin: string;
  supported: boolean;
  aliases?: string[];
};

/** Ngân hàng hỗ trợ tạo QR (supported: true trong banks.json). */
export const SEPAY_BANKS: SepayBank[] = [
  { short_name: "VietinBank", code: "ICB", bin: "970415", supported: true },
  { short_name: "Vietcombank", code: "VCB", bin: "970436", supported: true },
  { short_name: "MBBank", code: "MB", bin: "970422", supported: true },
  { short_name: "ACB", code: "ACB", bin: "970416", supported: true },
  { short_name: "VPBank", code: "VPB", bin: "970432", supported: true },
  { short_name: "TPBank", code: "TPB", bin: "970423", supported: true },
  { short_name: "MSB", code: "MSB", bin: "970426", supported: true },
  {
    short_name: "LienVietPostBank",
    code: "LPB",
    bin: "970449",
    supported: true,
    aliases: ["LPBank"],
  },
  {
    short_name: "VietCapitalBank",
    code: "VCCB",
    bin: "970454",
    supported: true,
    aliases: ["BVBank"],
  },
  { short_name: "BIDV", code: "BIDV", bin: "970418", supported: true },
  { short_name: "Sacombank", code: "STB", bin: "970403", supported: true },
  { short_name: "VIB", code: "VIB", bin: "970441", supported: true },
  { short_name: "HDBank", code: "HDB", bin: "970437", supported: true },
  { short_name: "SeABank", code: "SEAB", bin: "970440", supported: true },
  { short_name: "ShinhanBank", code: "SHBVN", bin: "970424", supported: true },
  { short_name: "Agribank", code: "VBA", bin: "970405", supported: true },
  { short_name: "Techcombank", code: "TCB", bin: "970407", supported: true },
  { short_name: "BacABank", code: "BAB", bin: "970409", supported: true },
  { short_name: "ABBANK", code: "ABB", bin: "970425", supported: true },
  { short_name: "Eximbank", code: "EIB", bin: "970431", supported: true },
  { short_name: "PublicBank", code: "PBVN", bin: "970439", supported: true },
  { short_name: "OCB", code: "OCB", bin: "970448", supported: true },
  { short_name: "KienLongBank", code: "KLB", bin: "970452", supported: true },
];

const SEPAY_BY_CODE = new Map(
  SEPAY_BANKS.map((b) => [b.code.toUpperCase(), b])
);

const SEPAY_BY_BIN = new Map(SEPAY_BANKS.map((b) => [b.bin, b]));

function normalizeBankKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const SEPAY_BY_KEY = new Map<string, SepayBank>();
for (const bank of SEPAY_BANKS) {
  SEPAY_BY_KEY.set(normalizeBankKey(bank.short_name), bank);
  SEPAY_BY_KEY.set(normalizeBankKey(bank.code), bank);
  SEPAY_BY_KEY.set(bank.bin, bank);
  for (const alias of bank.aliases ?? []) {
    SEPAY_BY_KEY.set(normalizeBankKey(alias), bank);
  }
}

/** Khớp theo code, tên, alias hoặc BIN cũ (legacy). */
export function findSepayBank(
  bankName?: string | null,
  bankCode?: string | null
): SepayBank | null {
  const code = bankCode?.trim().toUpperCase();
  if (code && SEPAY_BY_CODE.has(code)) {
    return SEPAY_BY_CODE.get(code)!;
  }

  const name = bankName?.trim();
  if (name) {
    const byKey = SEPAY_BY_KEY.get(normalizeBankKey(name));
    if (byKey) return byKey;
  }

  // Legacy: cột cũ có thể còn BIN 6 chữ số
  const legacyBin = bankCode?.trim();
  if (legacyBin && SEPAY_BY_BIN.has(legacyBin)) {
    return SEPAY_BY_BIN.get(legacyBin)!;
  }

  return null;
}

/**
 * Giá trị tham số `bank` cho URL SePay — dùng code (VD: TPB, MB).
 * @see https://qr.sepay.vn/
 */
export function resolveSepayBankParam(
  bankName?: string | null,
  bankCode?: string | null
): string | null {
  const matched = findSepayBank(bankName, bankCode);
  if (matched) return matched.code;

  const code = bankCode?.trim();
  if (code) return code.toUpperCase();

  const name = bankName?.trim();
  if (name) return name;

  return null;
}

export function sepayBanksConflict(
  bankName?: string | null,
  bankCode?: string | null
): boolean {
  const name = bankName?.trim();
  const code = bankCode?.trim()?.toUpperCase();
  if (!name || !code) return false;

  const fromName = SEPAY_BY_KEY.get(normalizeBankKey(name));
  const fromCode = SEPAY_BY_CODE.get(code);
  if (!fromName || !fromCode) return false;

  return fromName.code !== fromCode.code;
}

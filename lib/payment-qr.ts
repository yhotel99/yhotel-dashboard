/** Bỏ dấu tiếng Việt — nội dung CK ngân hàng thường không hỗ trợ Unicode có dấu. */
export function removeVietnameseDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function normalizePaymentDescription(description: string): string {
  return removeVietnameseDiacritics(description.trim());
}

export function buildSepayQrImageUrl(params: {
  acc: string;
  bank: string;
  amount: number;
  description: string;
  template?: "compact" | "default";
}): string {
  const amount = Math.max(0, Math.round(params.amount));
  const template = params.template ?? "compact";
  const description = normalizePaymentDescription(params.description);
  return `https://qr.sepay.vn/img?acc=${encodeURIComponent(params.acc)}&bank=${encodeURIComponent(params.bank)}&amount=${amount}&des=${encodeURIComponent(description)}&template=${template}`;
}

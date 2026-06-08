export function buildSepayQrImageUrl(params: {
  acc: string;
  bank: string;
  amount: number;
  description: string;
  template?: "compact" | "default";
}): string {
  const amount = Math.max(0, Math.round(params.amount));
  const template = params.template ?? "compact";
  return `https://qr.sepay.vn/img?acc=${encodeURIComponent(params.acc)}&bank=${encodeURIComponent(params.bank)}&amount=${amount}&des=${encodeURIComponent(params.description)}&template=${template}`;
}

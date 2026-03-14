import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  if (!_resend) {
    _resend = new Resend(key);
  }
  return _resend;
}

export function getResendFromAddress(): string {
  return process.env.RESEND_FROM || "YHotel <hello@yhotel.vn>";
}


/**
 * Excel invoice ↔ dashboard booking reconcile helpers.
 * Pure functions — no I/O.
 */

import { parseBookingRevenueAmount } from "@/lib/reports/booking-revenue";
import { toYyyyMmDdVN } from "@/lib/reports/revenue-dashboard-math";

export type ReconcileMatchReason = "name" | "room_dates" | null;

export type ReconcileStatus =
  | "matched"
  | "matched_room"
  | "amount_diff"
  | "excel_only"
  | "dashboard_only";

export type ExcelInvoiceRaw = {
  soHd: string;
  ten: string;
  cty: string;
  phong: string;
  ngayDen: string | null; // YYYY-MM-DD
  ngayDi: string | null;
  thanhTien: number;
  tongTt: number;
};

export type ExcelStay = {
  name: string;
  label: string;
  phong: string;
  roomTokens: string[];
  ngayDen: string | null;
  ngayDi: string | null;
  thanhTien: number;
  tongTt: number;
  nHd: number;
  soHds: string[];
};

export type DashBookingRow = {
  id: string;
  bookingCode: string;
  fullName: string;
  nameNorm: string;
  roomNumbers: string[];
  checkIn: string | null;
  checkOut: string | null;
  actualCheckOut: string | null;
  /** Primary date used for name+date match (from filter dateField). */
  matchDate: string | null;
  amount: number;
};

export type ReconcilePairRow = {
  status: ReconcileStatus;
  matchReason: ReconcileMatchReason;
  excel: ExcelStay | null;
  dashboard: DashBookingRow | null;
  delta: number;
};

export type ReconcileSummary = {
  excelStayCount: number;
  dashboardBookingCount: number;
  excelTongTt: number;
  dashboardAmount: number;
  deltaAmount: number;
  matched: number;
  matchedRoom: number;
  amountDiff: number;
  excelOnly: number;
  dashboardOnly: number;
};

export function normalizePersonName(s: string | null | undefined): string {
  if (!s) return "";
  let out = String(s).trim().toUpperCase();
  out = out.normalize("NFD").replace(/\p{M}/gu, "");
  out = out.replace(/Đ/g, "D").replace(/đ/g, "D");
  out = out.replace(/[^A-Z0-9\s]/g, " ");
  return out.replace(/\s+/g, " ").trim();
}

export function parseExcelDateCell(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return toYyyyMmDdVN(v);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel serial date
    const epoch = Date.UTC(1899, 11, 30);
    const ms = epoch + Math.round(v) * 86400000;
    return toYyyyMmDdVN(new Date(ms));
  }
  const s = String(v).trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return toYyyyMmDdVN(d);
  return null;
}

export function parseMoneyCell(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return 0;
  const s = String(v).replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Split "302 203" / "501, 203" into room tokens. */
export function parseRoomTokens(phong: string | null | undefined): string[] {
  if (!phong) return [];
  return String(phong)
    .split(/[\s,;/|]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Merge consecutive invoices with the same guest name into one stay.
 * Same name non-adjacent stays remain separate.
 */
export function mergeConsecutiveExcelStays(
  invoices: ExcelInvoiceRaw[]
): ExcelStay[] {
  const stays: ExcelStay[] = [];
  for (const inv of invoices) {
    const name = normalizePersonName(inv.ten) || normalizePersonName(inv.cty);
    const label = inv.ten.trim() || inv.cty.trim() || inv.soHd;
    const roomTokens = parseRoomTokens(inv.phong);
    if (stays.length > 0 && name && stays[stays.length - 1].name === name) {
      const last = stays[stays.length - 1];
      last.thanhTien += inv.thanhTien;
      last.tongTt += inv.tongTt;
      last.nHd += 1;
      last.soHds.push(inv.soHd);
      if (inv.phong) {
        last.phong = [last.phong, inv.phong].filter(Boolean).join(" ");
        last.roomTokens = [
          ...new Set([...last.roomTokens, ...roomTokens]),
        ];
      }
      if (
        inv.ngayDen &&
        (!last.ngayDen || inv.ngayDen < last.ngayDen)
      ) {
        last.ngayDen = inv.ngayDen;
      }
      if (inv.ngayDi && (!last.ngayDi || inv.ngayDi > last.ngayDi)) {
        last.ngayDi = inv.ngayDi;
      }
      continue;
    }
    stays.push({
      name,
      label,
      phong: inv.phong.trim(),
      roomTokens,
      ngayDen: inv.ngayDen,
      ngayDi: inv.ngayDi,
      thanhTien: inv.thanhTien,
      tongTt: inv.tongTt,
      nHd: 1,
      soHds: [inv.soHd],
    });
  }
  return stays;
}

export function bookingRoomNumbers(booking: {
  rooms?: {
    room_number?: string | null;
    name?: string | null;
    items?: Array<{ room_number?: string | null; name?: string | null }>;
  } | null;
  booking_rooms?: Array<{
    rooms?: { room_number?: string | null; name?: string | null } | null;
  }> | null;
  room_number?: string | null;
}): string[] {
  const out = new Set<string>();
  const add = (v?: string | null) => {
    if (!v) return;
    for (const t of parseRoomTokens(v)) out.add(t);
  };
  add(booking.room_number);
  if (booking.rooms) {
    add(booking.rooms.room_number);
    add(booking.rooms.name);
    for (const item of booking.rooms.items ?? []) {
      add(item.room_number);
      add(item.name);
    }
  }
  for (const br of booking.booking_rooms ?? []) {
    add(br.rooms?.room_number);
    add(br.rooms?.name);
  }
  return [...out];
}

export function toDashBookingRow(
  booking: {
    id: string;
    booking_code?: string | null;
    check_in?: string | null;
    check_out?: string | null;
    actual_check_out?: string | null;
    created_at?: string | null;
    final_amount?: unknown;
    total_amount?: unknown;
    customers?: { full_name?: string | null } | null;
    rooms?: DashBookingRow extends never ? never : {
      room_number?: string | null;
      name?: string | null;
      items?: Array<{ room_number?: string | null; name?: string | null }>;
    } | null;
    booking_rooms?: Array<{
      rooms?: { room_number?: string | null; name?: string | null } | null;
    }> | null;
    room_number?: string | null;
  },
  dateField: "created_at" | "check_in" | "check_out" | "actual_check_out"
): DashBookingRow {
  const fullName = booking.customers?.full_name?.trim() || "";
  const rawDate =
    dateField === "created_at"
      ? booking.created_at
      : dateField === "check_in"
        ? booking.check_in
        : dateField === "check_out"
          ? booking.check_out
          : booking.actual_check_out;
  const matchDate = rawDate
    ? toYyyyMmDdVN(new Date(rawDate))
    : null;
  return {
    id: booking.id,
    bookingCode: booking.booking_code || "",
    fullName,
    nameNorm: normalizePersonName(fullName),
    roomNumbers: bookingRoomNumbers(booking),
    checkIn: booking.check_in
      ? toYyyyMmDdVN(new Date(booking.check_in))
      : null,
    checkOut: booking.check_out
      ? toYyyyMmDdVN(new Date(booking.check_out))
      : null,
    actualCheckOut: booking.actual_check_out
      ? toYyyyMmDdVN(new Date(booking.actual_check_out))
      : null,
    matchDate,
    amount: parseBookingRevenueAmount(booking),
  };
}

function roomsOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const setB = new Set(b);
  return a.some((x) => setB.has(x));
}

function amountClose(a: number, b: number): boolean {
  return Math.abs(a - b) < 2;
}

/**
 * Waterfall match:
 * 1) name + matchDate (or ngayDi)
 * 2) room tokens + check_in/check_out (ngayDen/ngayDi)
 */
export function reconcileExcelWithDashboard(
  stays: ExcelStay[],
  bookings: DashBookingRow[]
): { rows: ReconcilePairRow[]; summary: ReconcileSummary } {
  const used = new Set<string>();
  const rows: ReconcilePairRow[] = [];

  const findByNameDate = (stay: ExcelStay): DashBookingRow | null => {
    if (!stay.name) return null;
    const day = stay.ngayDi;
    // Prefer same name + same checkout day
    if (day) {
      for (const b of bookings) {
        if (used.has(b.id) || b.nameNorm !== stay.name) continue;
        if (b.matchDate === day || b.actualCheckOut === day || b.checkOut === day) {
          return b;
        }
      }
    }
    // Same name unused
    for (const b of bookings) {
      if (!used.has(b.id) && b.nameNorm === stay.name) return b;
    }
    return null;
  };

  const findByRoomDates = (stay: ExcelStay): DashBookingRow | null => {
    if (!stay.roomTokens.length) return null;
    for (const b of bookings) {
      if (used.has(b.id)) continue;
      if (!roomsOverlap(stay.roomTokens, b.roomNumbers)) continue;
      const inOk =
        !stay.ngayDen ||
        b.checkIn === stay.ngayDen ||
        b.checkIn === stay.ngayDi;
      const outOk =
        !stay.ngayDi ||
        b.checkOut === stay.ngayDi ||
        b.actualCheckOut === stay.ngayDi ||
        b.matchDate === stay.ngayDi;
      // Require both ends when Excel has both; otherwise require the available side + room
      if (stay.ngayDen && stay.ngayDi) {
        if (b.checkIn === stay.ngayDen && (b.checkOut === stay.ngayDi || b.actualCheckOut === stay.ngayDi)) {
          return b;
        }
      } else if (inOk && outOk) {
        return b;
      }
    }
    return null;
  };

  for (const stay of stays) {
    let match = findByNameDate(stay);
    let reason: ReconcileMatchReason = match ? "name" : null;
    if (!match) {
      match = findByRoomDates(stay);
      if (match) reason = "room_dates";
    }
    if (match) {
      used.add(match.id);
      const delta = match.amount - stay.tongTt;
      const status: ReconcileStatus = amountClose(match.amount, stay.tongTt)
        ? reason === "room_dates"
          ? "matched_room"
          : "matched"
        : "amount_diff";
      rows.push({
        status,
        matchReason: reason,
        excel: stay,
        dashboard: match,
        delta,
      });
    } else {
      rows.push({
        status: "excel_only",
        matchReason: null,
        excel: stay,
        dashboard: null,
        delta: -stay.tongTt,
      });
    }
  }

  for (const b of bookings) {
    if (used.has(b.id)) continue;
    rows.push({
      status: "dashboard_only",
      matchReason: null,
      excel: null,
      dashboard: b,
      delta: b.amount,
    });
  }

  rows.sort((a, b) => {
    const da =
      a.excel?.ngayDi ||
      a.dashboard?.matchDate ||
      a.dashboard?.actualCheckOut ||
      "";
    const db =
      b.excel?.ngayDi ||
      b.dashboard?.matchDate ||
      b.dashboard?.actualCheckOut ||
      "";
    if (da !== db) return da < db ? -1 : 1;
    const na = a.excel?.name || a.dashboard?.nameNorm || "";
    const nb = b.excel?.name || b.dashboard?.nameNorm || "";
    return na.localeCompare(nb);
  });

  const excelTongTt = stays.reduce((s, x) => s + x.tongTt, 0);
  const dashboardAmount = bookings.reduce((s, x) => s + x.amount, 0);
  const summary: ReconcileSummary = {
    excelStayCount: stays.length,
    dashboardBookingCount: bookings.length,
    excelTongTt,
    dashboardAmount,
    deltaAmount: dashboardAmount - excelTongTt,
    matched: rows.filter((r) => r.status === "matched").length,
    matchedRoom: rows.filter((r) => r.status === "matched_room").length,
    amountDiff: rows.filter((r) => r.status === "amount_diff").length,
    excelOnly: rows.filter((r) => r.status === "excel_only").length,
    dashboardOnly: rows.filter((r) => r.status === "dashboard_only").length,
  };

  return { rows, summary };
}

/** Header aliases for PDP invoice sheet (row with STT / Số hóa đơn). */
const HEADER_ALIASES = {
  soHd: ["so hoa don", "so hd", "invoice"],
  // Prefer "Người mua hàng" — do NOT use short "ten khach" (matches "Tên khách hàng")
  ten: ["nguoi mua hang", "nguoi mua", "buyer"],
  cty: ["ten khach hang", "ten cong ty", "company"],
  phong: ["phong so", "phong", "room"],
  ngayDen: ["ngay den", "check in", "check-in"],
  ngayDi: ["ngay di", "check out", "check-out"],
  thanhTien: ["thanh tien"],
  tongTt: ["tong tien tt", "tong tien"],
} as const;

function normHeader(s: unknown): string {
  return normalizePersonName(String(s ?? "")).toLowerCase();
}

/** Exact match first, then longest alias contained in header (avoids short false positives). */
function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  const norms = aliases
    .map((a) => normHeader(a))
    .filter(Boolean)
    .toSorted((a, b) => b.length - a.length);

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if (norms.some((a) => h === a)) return i;
  }
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    for (const a of norms) {
      if (h.includes(a)) return i;
    }
  }
  return -1;
}

/**
 * Parse sheet rows (array-of-arrays) into invoice lines, then consecutive stays.
 * Looks for header row containing "Số hóa đơn" / STT.
 */
export function parseInvoiceSheetRows(matrix: unknown[][]): {
  invoices: ExcelInvoiceRaw[];
  stays: ExcelStay[];
} {
  let headerRow = -1;
  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    const cells = (matrix[r] ?? []).map(normHeader);
    if (
      cells.some((c) => c.includes("so hoa don") || c.includes("số hóa đơn")) ||
      (cells.includes("stt") && cells.some((c) => c.includes("ngay")))
    ) {
      headerRow = r;
      break;
    }
    // Fallback: look for tong tien tt
    if (cells.some((c) => c.includes("tong tien tt") || c.includes("tổng tiền tt"))) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error(
      "Không tìm thấy dòng tiêu đề (cần cột Số hóa đơn / Người mua hàng / Tổng tiền TT)"
    );
  }

  const headers = (matrix[headerRow] ?? []).map(normHeader);
  const idx = {
    soHd: findHeaderIndex(headers, HEADER_ALIASES.soHd),
    ten: findHeaderIndex(headers, HEADER_ALIASES.ten),
    cty: findHeaderIndex(headers, HEADER_ALIASES.cty),
    phong: findHeaderIndex(headers, HEADER_ALIASES.phong),
    ngayDen: findHeaderIndex(headers, HEADER_ALIASES.ngayDen),
    ngayDi: findHeaderIndex(headers, HEADER_ALIASES.ngayDi),
    thanhTien: findHeaderIndex(headers, HEADER_ALIASES.thanhTien),
    tongTt: findHeaderIndex(headers, HEADER_ALIASES.tongTt),
  };
  if (idx.soHd < 0 || idx.tongTt < 0) {
    throw new Error("Thiếu cột bắt buộc: Số hóa đơn hoặc Tổng tiền TT");
  }

  const bySo = new Map<string, ExcelInvoiceRaw>();
  const order: string[] = [];

  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const soRaw = row[idx.soHd];
    if (soRaw == null || String(soRaw).trim() === "") continue;
    const soHd = String(soRaw).trim();
    // Skip totals row
    const first = row[0];
    if (
      typeof first === "string" &&
      normalizePersonName(first).includes("TONG CONG")
    ) {
      continue;
    }
    const thanhTien =
      idx.thanhTien >= 0 ? parseMoneyCell(row[idx.thanhTien]) : 0;
    const tongTt = parseMoneyCell(row[idx.tongTt]);
    if (!Number.isFinite(tongTt) && !Number.isFinite(thanhTien)) continue;
    // Grand total row often has huge amount and empty name
    const ten = idx.ten >= 0 ? String(row[idx.ten] ?? "").trim() : "";
    const cty = idx.cty >= 0 ? String(row[idx.cty] ?? "").trim() : "";
    if (!ten && !cty && thanhTien > 1_000_000_000) continue;

    if (!bySo.has(soHd)) {
      bySo.set(soHd, {
        soHd,
        ten,
        cty,
        phong: idx.phong >= 0 ? String(row[idx.phong] ?? "").trim() : "",
        ngayDen:
          idx.ngayDen >= 0 ? parseExcelDateCell(row[idx.ngayDen]) : null,
        ngayDi: idx.ngayDi >= 0 ? parseExcelDateCell(row[idx.ngayDi]) : null,
        thanhTien: 0,
        tongTt: 0,
      });
      order.push(soHd);
    }
    const inv = bySo.get(soHd)!;
    inv.thanhTien += thanhTien;
    inv.tongTt += tongTt;
    if (!inv.ten && ten) inv.ten = ten;
    if (!inv.cty && cty) inv.cty = cty;
    if (idx.phong >= 0) {
      const p = String(row[idx.phong] ?? "").trim();
      if (p && !inv.phong.includes(p)) {
        inv.phong = [inv.phong, p].filter(Boolean).join(" ");
      }
    }
  }

  const invoices = order.map((k) => bySo.get(k)!);
  const stays = mergeConsecutiveExcelStays(invoices);
  return { invoices, stays };
}

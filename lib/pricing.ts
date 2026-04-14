import type {
  DailyPricingBreakdownItem,
  PricingHolidayPeriod,
  WeekdayRates,
} from "@/lib/types";

export const DEFAULT_WEEKDAY_RATES: WeekdayRates = [0, 0, 0, 0, 0, 15, 20];

export function normalizeWeekdayRates(input: unknown): WeekdayRates {
  if (Array.isArray(input) && input.length === 7) {
    return input.map((x) => (Number.isFinite(Number(x)) ? Number(x) : 0)) as WeekdayRates;
  }

  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const rates = Array.from({ length: 7 }).map((_, i) => {
      const v = obj[String(i)];
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    });
    return rates as WeekdayRates;
  }

  return DEFAULT_WEEKDAY_RATES;
}

export function normalizeHolidayPeriods(
  input: unknown
): PricingHolidayPeriod[] {
  if (!Array.isArray(input)) return [];
  const out: PricingHolidayPeriod[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
    const label =
      typeof o.label === "string" && o.label.trim() ? o.label.trim() : "";
    const start =
      typeof o.start_date === "string" ? o.start_date.trim() : "";
    const end = typeof o.end_date === "string" ? o.end_date.trim() : "";
    const pctRaw = o.surcharge_percent;
    const pct =
      typeof pctRaw === "number"
        ? pctRaw
        : Number(typeof pctRaw === "string" ? pctRaw : NaN);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
      continue;
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) continue;
    if (start > end) continue;
    out.push({
      id: id || `holiday_${start}_${end}_${label || "period"}`,
      label: label || "Kỳ lễ",
      start_date: start,
      end_date: end,
      surcharge_percent: pct,
    });
  }
  return out;
}

function holidayHitForDate(
  dateStr: string,
  periods: PricingHolidayPeriod[]
): { percent: number; label: string | null } {
  let best = 0;
  let label: string | null = null;
  for (const p of periods) {
    if (dateStr >= p.start_date && dateStr <= p.end_date) {
      const s = Number.isFinite(p.surcharge_percent) ? p.surcharge_percent : 0;
      if (s > best) {
        best = s;
        label = p.label || null;
      } else if (s === best && s > 0 && !label) {
        label = p.label || null;
      }
    }
  }
  return { percent: best, label };
}

function startOfDayLocal(dateStr: string): Date {
  // Use local midnight to keep weekday stable for VN locale
  return new Date(`${dateStr}T00:00:00`);
}

export function calculateTotalWithWeekdayRates({
  basePrice,
  checkInDate,
  checkOutDate,
  weekdayRates,
  holidayPeriods,
}: {
  basePrice: number;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  weekdayRates: WeekdayRates;
  /** Nếu có, mỗi đêm dùng max(% theo thứ, % kỳ lễ khớp ngày). */
  holidayPeriods?: PricingHolidayPeriod[];
}): {
  total: number;
  breakdown: DailyPricingBreakdownItem[];
} {
  const holidays = holidayPeriods?.length
    ? normalizeHolidayPeriods(holidayPeriods)
    : [];
  const inD = startOfDayLocal(checkInDate);
  const outDInput = startOfDayLocal(checkOutDate);

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { total: 0, breakdown: [] };
  }
  if (Number.isNaN(inD.getTime()) || Number.isNaN(outDInput.getTime())) {
    return { total: 0, breakdown: [] };
  }

  // Day-use: same calendar day still counts as 1 night.
  const outD =
    outDInput.getTime() === inD.getTime()
      ? new Date(inD.getFullYear(), inD.getMonth(), inD.getDate() + 1)
      : outDInput;

  if (outD < inD) {
    return { total: 0, breakdown: [] };
  }

  let total = 0;
  const breakdown: DailyPricingBreakdownItem[] = [];

  for (let d = new Date(inD); d < outD; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    const weekdayPercentRaw = weekdayRates[weekday] ?? 0;
    const weekdayPercent = Number.isFinite(weekdayPercentRaw)
      ? weekdayPercentRaw
      : 0;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const { percent: hPercent, label: hLabel } = holidayHitForDate(
      dateStr,
      holidays
    );
    const percent = Math.max(weekdayPercent, hPercent);
    const holiday_label =
      hPercent > 0 && hPercent >= weekdayPercent ? hLabel : null;

    const price = basePrice + (basePrice * percent) / 100;
    total += price;

    breakdown.push({
      date: dateStr,
      weekday,
      percent,
      price,
      holiday_label,
    });
  }

  return { total, breakdown };
}


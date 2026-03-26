import type { DailyPricingBreakdownItem, WeekdayRates } from "@/lib/types";

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

function startOfDayLocal(dateStr: string): Date {
  // Use local midnight to keep weekday stable for VN locale
  return new Date(`${dateStr}T00:00:00`);
}

export function calculateTotalWithWeekdayRates({
  basePrice,
  checkInDate,
  checkOutDate,
  weekdayRates,
}: {
  basePrice: number;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  weekdayRates: WeekdayRates;
}): {
  total: number;
  breakdown: DailyPricingBreakdownItem[];
} {
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
    const percentRaw = weekdayRates[weekday] ?? 0;
    const percent = Number.isFinite(percentRaw) ? percentRaw : 0;
    const price = basePrice + (basePrice * percent) / 100;
    total += price;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    breakdown.push({
      date: `${yyyy}-${mm}-${dd}`,
      weekday,
      percent,
      price,
    });
  }

  return { total, breakdown };
}


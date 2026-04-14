import type { PricingHolidayPeriod } from "@/lib/types";

type PresetRow = Omit<PricingHolidayPeriod, "id">;

/**
 * Gợi ý nhanh theo các đợt nghỉ lễ phổ biến tại VN (dương lịch).
 * Ngày Tết/Giỗ Tổ có thể lệch theo quyết định từng năm — admin nên rà lại sau khi thêm.
 */
const BY_YEAR: Record<number, PresetRow[]> = {
  2025: [
    {
      label: "Tết Dương lịch",
      start_date: "2025-01-01",
      end_date: "2025-01-01",
      surcharge_percent: 20,
    },
    {
      label: "Tết Nguyên đán 2025 (ước lượng)",
      start_date: "2025-01-28",
      end_date: "2025-02-04",
      surcharge_percent: 30,
    },
    {
      label: "Giỗ Tổ Hùng Vương (ước lượng)",
      start_date: "2025-04-07",
      end_date: "2025-04-07",
      surcharge_percent: 20,
    },
    {
      label: "30/4 & 1/5",
      start_date: "2025-04-30",
      end_date: "2025-05-01",
      surcharge_percent: 20,
    },
    {
      label: "Quốc khánh 2/9",
      start_date: "2025-09-02",
      end_date: "2025-09-02",
      surcharge_percent: 20,
    },
  ],
  2026: [
    {
      label: "Tết Dương lịch",
      start_date: "2026-01-01",
      end_date: "2026-01-01",
      surcharge_percent: 20,
    },
    {
      label: "Tết Nguyên đán 2026 (theo khối nghỉ 9 ngày phổ biến)",
      start_date: "2026-02-14",
      end_date: "2026-02-22",
      surcharge_percent: 30,
    },
    {
      label: "Giỗ Tổ Hùng Vương (ước lượng)",
      start_date: "2026-04-26",
      end_date: "2026-04-26",
      surcharge_percent: 20,
    },
    {
      label: "30/4 & 1/5",
      start_date: "2026-04-30",
      end_date: "2026-05-01",
      surcharge_percent: 20,
    },
    {
      label: "Quốc khánh (khối nghỉ phổ biến)",
      start_date: "2026-09-01",
      end_date: "2026-09-02",
      surcharge_percent: 20,
    },
  ],
  2027: [
    {
      label: "Tết Dương lịch",
      start_date: "2027-01-01",
      end_date: "2027-01-01",
      surcharge_percent: 20,
    },
    {
      label: "Tết Nguyên đán 2027 (ước lượng)",
      start_date: "2027-02-05",
      end_date: "2027-02-12",
      surcharge_percent: 30,
    },
    {
      label: "Giỗ Tổ Hùng Vương (ước lượng)",
      start_date: "2027-04-16",
      end_date: "2027-04-16",
      surcharge_percent: 20,
    },
    {
      label: "30/4 & 1/5",
      start_date: "2027-04-30",
      end_date: "2027-05-01",
      surcharge_percent: 20,
    },
    {
      label: "Quốc khánh 2/9",
      start_date: "2027-09-02",
      end_date: "2027-09-02",
      surcharge_percent: 20,
    },
  ],
};

export function getSupportedPresetYears(): number[] {
  return Object.keys(BY_YEAR)
    .map(Number)
    .sort((a, b) => a - b);
}

export function getSuggestedVnHolidayPeriods(year: number): PricingHolidayPeriod[] {
  const rows = BY_YEAR[year];
  if (!rows) return [];
  return rows.map((row, index) => ({
    ...row,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `vn_preset_${year}_${index}_${Date.now()}`,
  }));
}

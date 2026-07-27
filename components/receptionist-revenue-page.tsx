"use client";

import { useState } from "react";
import { endOfDay, startOfMonth } from "date-fns";
import { useBranch } from "@/contexts/branch-context";
import { ReceptionistRevenueReport } from "@/components/receptionist-revenue-report";
import { DateRangePicker } from "@/components/date-range/date-range-picker";

function getMonthToDateRange() {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfDay(now),
  };
}

export function ReceptionistRevenuePageContent() {
  const { scope, selectedBranchId } = useBranch();
  const branchIdForFetch =
    scope.mode === "single" ? scope.branchId : selectedBranchId;
  const [dateRange, setDateRange] = useState(getMonthToDateRange);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Báo cáo lễ tân</h1>
          <p className="text-muted-foreground mt-1">
            Tiền về túi và hiệu suất xử lý booking theo từng nhân viên lễ tân.
          </p>
        </div>
        <DateRangePicker
          initialDateFrom={dateRange.from}
          initialDateTo={dateRange.to}
          onUpdate={(values) => {
            if (values.range.from && values.range.to) {
              setDateRange({
                from: values.range.from,
                to: values.range.to,
              });
            }
          }}
          showCompare={false}
          locale="vi-VN"
        />
      </div>
      <ReceptionistRevenueReport
        fromDate={dateRange.from}
        toDate={dateRange.to}
        branchId={branchIdForFetch}
      />
    </div>
  );
}

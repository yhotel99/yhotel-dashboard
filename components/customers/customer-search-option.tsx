"use client";

import type { Customer } from "@/lib/types";
import { getBranchTableLabel } from "@/lib/branch";

type CustomerSearchOptionProps = {
  customer: Customer;
  branchNameById: Readonly<Record<string, string>>;
  bookingBranchId?: string | null;
};

export function CustomerSearchOption({
  customer,
  branchNameById,
  bookingBranchId,
}: CustomerSearchOptionProps) {
  const homeBranchLabel = getBranchTableLabel(customer.branch_id, branchNameById);
  const isOtherBranch =
    bookingBranchId &&
    customer.branch_id &&
    customer.branch_id !== bookingBranchId;

  return (
    <>
      <div className="font-medium">{customer.full_name}</div>
      <div className="text-xs text-muted-foreground">
        {customer.phone ? `${customer.phone} • ` : null}
        {customer.email}
        {homeBranchLabel !== "—" ? ` • CN gốc: ${homeBranchLabel}` : null}
      </div>
      {isOtherBranch ? (
        <div className="text-xs text-muted-foreground">
          Khách thuộc chi nhánh khác — booking sẽ ghi nhận tại chi nhánh đang chọn
        </div>
      ) : null}
    </>
  );
}

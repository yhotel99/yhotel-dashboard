"use client";

import { useEffect, useState } from "react";
import {
  findRelatedCustomersAction,
  type RelatedCustomerRow,
} from "@/actions/customers";
import type { Customer } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

export function CustomerRelatedBranchesSection({
  customer,
}: {
  customer: Customer;
}) {
  const canSearch = Boolean(customer.email || customer.phone);
  const [related, setRelated] = useState<RelatedCustomerRow[]>([]);

  if (!canSearch && related.length > 0) {
    setRelated([]);
  }

  useEffect(() => {
    if (!canSearch) return;

    findRelatedCustomersAction({
      email: customer.email,
      phone: customer.phone || undefined,
      excludeId: customer.id,
      currentBranchId: customer.branch_id,
    }).then((result) => {
      if (result.ok) {
        setRelated(result.data);
      }
    });
  }, [canSearch, customer.id, customer.email, customer.phone, customer.branch_id]);

  if (related.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          Khách cùng thông tin tại chi nhánh khác
        </h3>
        <ul className="space-y-2 text-sm">
          {related.map((row) => (
            <li
              key={row.id}
              className="flex justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="font-medium">{row.full_name}</span>
              <span className="text-muted-foreground">{row.branch_name}</span>
            </li>
          ))}
        </ul>
      </div>
      <Separator />
    </>
  );
}

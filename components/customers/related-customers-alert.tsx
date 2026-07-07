"use client";

import { useEffect, useState } from "react";
import {
  findRelatedCustomersAction,
  type RelatedCustomerRow,
} from "@/actions/customers";

type RelatedCustomersAlertProps = {
  email?: string;
  phone?: string;
  excludeId?: string;
  currentBranchId?: string | null;
};

export function RelatedCustomersAlert({
  email,
  phone,
  excludeId,
  currentBranchId,
}: RelatedCustomersAlertProps) {
  const trimmedEmail = email?.trim() ?? "";
  const trimmedPhone = phone?.trim() ?? "";
  const canSearch = Boolean(trimmedEmail || trimmedPhone);
  const [related, setRelated] = useState<RelatedCustomerRow[]>([]);

  if (!canSearch && related.length > 0) {
    setRelated([]);
  }

  useEffect(() => {
    if (!canSearch) return;

    const timer = setTimeout(() => {
      findRelatedCustomersAction({
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        excludeId,
        currentBranchId,
      }).then((result) => {
        if (result.ok) {
          setRelated(result.data);
        } else {
          setRelated([]);
        }
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [canSearch, trimmedEmail, trimmedPhone, excludeId, currentBranchId]);

  if (related.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
      <p className="font-medium text-amber-900 dark:text-amber-200">
        Khách tương tự tại chi nhánh khác
      </p>
      <ul className="mt-1 list-disc pl-4 space-y-0.5 text-muted-foreground">
        {related.map((row) => (
          <li key={row.id}>
            {row.full_name} — {row.branch_name}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Có thể tạo bản ghi khách mới cho chi nhánh hiện tại nếu cùng một người
        lưu trú tại đây.
      </p>
    </div>
  );
}

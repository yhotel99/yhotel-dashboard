"use client";

import { useRouter } from "next/navigation";
import {
  IconCalendar,
  IconMail,
  IconPhone,
  IconId,
  IconWorld,
  IconUser,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Customer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerDetailDialog({
  open,
  onOpenChange,
  customer,
}: CustomerDetailDialogProps) {
  const router = useRouter();

  if (!customer) return null;

  const handleViewBookings = () => {
    onOpenChange(false);
    router.push(`/dashboard/customers/${customer.id}/bookings`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUser className="size-5" />
            Chi tiết khách hàng
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về khách hàng {customer.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Họ và tên
                </label>
                <p className="text-base font-medium">{customer.full_name}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IconMail className="size-4" />
                  Email
                </label>
                <p className="text-base">{customer.email || "-"}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IconPhone className="size-4" />
                  Số điện thoại
                </label>
                <p className="text-base">{customer.phone || "-"}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IconId className="size-4" />
                  CMND/CCCD
                </label>
                <p className="text-base">{customer.id_card || "-"}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IconCalendar className="size-4" />
                  Ngày sinh
                </label>
                <p className="text-base">
                  {customer.date_of_birth
                    ? formatDate(customer.date_of_birth)
                    : "-"}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IconWorld className="size-4" />
                  Quốc tịch
                </label>
                <p className="text-base">{customer.nationality || "-"}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Loại khách hàng
                </label>
                <div>
                  <StatusBadge customerType={customer.customer_type} />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Thống kê</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Tổng số đơn đặt phòng
                </label>
                <p className="text-2xl font-bold">
                  {customer.total_bookings ?? 0} đơn
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Tổng chi tiêu
                </label>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(customer.total_spent ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Thông tin hệ thống</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Ngày đăng ký
                </label>
                <p className="text-base">{formatDate(customer.created_at)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Cập nhật lần cuối
                </label>
                <p className="text-base">{formatDate(customer.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button onClick={handleViewBookings}>Xem đặt phòng</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

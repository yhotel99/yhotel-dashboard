"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Customer, CustomerInput } from "@/hooks/use-customers";

type EditCustomerFormState = {
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  id_card: string;
  customer_type: "regular" | "vip" | "blacklist";
  date_of_birth: string;
};

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onUpdate: (id: string, input: CustomerInput) => Promise<void>;
}

export function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
  onUpdate,
}: EditCustomerDialogProps) {
  const [formValues, setFormValues] = useState<EditCustomerFormState>({
    full_name: "",
    email: "",
    phone: "",
    nationality: "",
    id_card: "",
    customer_type: "regular",
    date_of_birth: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customer data into form when customer changes
  useEffect(() => {
    if (customer && open) {
      // Format date for input (YYYY-MM-DD)
      const formatDateForInput = (dateString: string | null) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
      };

      setFormValues({
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone || "",
        nationality: customer.nationality || "",
        id_card: customer.id_card || "",
        customer_type: customer.customer_type,
        date_of_birth: formatDateForInput(customer.date_of_birth),
      });
      setError(null);
    }
  }, [customer, open]);

  const handleInputChange =
    (field: keyof EditCustomerFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelectChange =
    (field: keyof EditCustomerFormState) => (value: string) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const resetForm = () => {
    setError(null);
    setIsSubmitting(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer) return;

    setError(null);

    const fullName = formValues.full_name.trim();
    const email = formValues.email.trim();
    const phone = formValues.phone.trim();

    if (!fullName) {
      setError("Họ tên không được để trống.");
      return;
    }

    if (!email) {
      setError("Email không được để trống.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ.");
      return;
    }

    if (phone && !/^[0-9]{10,11}$/.test(phone)) {
      setError("Số điện thoại không hợp lệ (10-11 chữ số).");
      return;
    }

    const payload: CustomerInput = {
      full_name: fullName,
      email: email,
      phone: phone || null,
      nationality: formValues.nationality.trim() || null,
      id_card: formValues.id_card.trim() || null,
      customer_type: formValues.customer_type,
      date_of_birth: formValues.date_of_birth || null,
    };

    try {
      setIsSubmitting(true);
      await onUpdate(customer.id, payload);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể cập nhật khách hàng";
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-4xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa khách hàng</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin khách hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên *</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Nhập họ và tên"
                value={formValues.full_name}
                onChange={handleInputChange("full_name")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email"
                value={formValues.email}
                onChange={handleInputChange("email")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Nhập số điện thoại"
                value={formValues.phone}
                onChange={handleInputChange("phone")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_type">Loại khách hàng *</Label>
              <Select
                value={formValues.customer_type}
                onValueChange={handleSelectChange("customer_type")}
              >
                <SelectTrigger id="customer_type" className="w-full">
                  <SelectValue placeholder="Chọn loại khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Khách thường</SelectItem>
                  <SelectItem value="vip">Khách VIP</SelectItem>
                  <SelectItem value="blacklist">Danh sách đen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Quốc tịch</Label>
              <Input
                id="nationality"
                type="text"
                placeholder="Nhập quốc tịch"
                value={formValues.nationality}
                onChange={handleInputChange("nationality")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_card">CMND/Hộ chiếu</Label>
              <Input
                id="id_card"
                type="text"
                placeholder="Nhập số CMND/Hộ chiếu"
                value={formValues.id_card}
                onChange={handleInputChange("id_card")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Ngày sinh</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formValues.date_of_birth}
                onChange={handleInputChange("date_of_birth")}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


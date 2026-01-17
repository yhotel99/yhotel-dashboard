"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
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
import type { CustomerInput, CustomerType } from "@/lib/types";
import { toast } from "sonner";
import { translateCustomerError } from "@/lib/functions";
import {
  CUSTOMER_ERROR_PATTERNS,
  CUSTOMER_SOURCE,
  CUSTOMER_TYPE,
  customerSourceLabels,
} from "@/lib/constants";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";

type CreateCustomerFormState = {
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  id_card: string;
  customer_type: CustomerType;
  date_of_birth: string;
  source: string;
};

const initialCreateCustomerState: CreateCustomerFormState = {
  full_name: "",
  email: "",
  phone: "",
  nationality: "",
  id_card: "",
  customer_type: CUSTOMER_TYPE.REGULAR,
  date_of_birth: "",
  source: "",
};

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CustomerInput) => Promise<void>;
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateCustomerDialogProps) {
  const [formValues, setFormValues] = useState<CreateCustomerFormState>(
    initialCreateCustomerState
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange =
    (field: keyof CreateCustomerFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelectChange =
    (field: keyof CreateCustomerFormState) => (value: string) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const resetForm = () => {
    setFormValues(initialCreateCustomerState);
    setError(null);
    setIsSubmitting(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const formatDisplayDate = (value: string) => {
    if (!value) return null;
    try {
      return format(parseISO(value), "dd/MM/yyyy");
    } catch {
      return null;
    }
  };

  const handleDateSelect = (field: "date_of_birth") => (date?: Date) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: date ? format(date, "yyyy-MM-dd") : "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      source: formValues.source || null,
    };

    try {
      setIsSubmitting(true);
      await onCreate(payload);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : "Không thể tạo khách hàng";

      const errorMessage = translateCustomerError(rawMessage);
      console.log({ err });
      setError(errorMessage);
      setIsSubmitting(false);

      // Show toast for duplicate email error
      if (
        rawMessage.includes(CUSTOMER_ERROR_PATTERNS.DUPLICATE_EMAIL_KEY) ||
        rawMessage.includes(
          CUSTOMER_ERROR_PATTERNS.DUPLICATE_EMAIL_KEY_SHORT
        ) ||
        rawMessage.includes(CUSTOMER_ERROR_PATTERNS.DUPLICATE_KEY_GENERAL)
      ) {
        toast.error("Tạo khách hàng thất bại", {
          description: errorMessage,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tạo khách hàng mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết để tạo khách hàng mới.
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                  >
                    {formatDisplayDate(formValues.date_of_birth) || "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <Calendar
                    key={formValues.date_of_birth || "default"}
                    mode="single"
                    selected={
                      formValues.date_of_birth
                        ? parseISO(formValues.date_of_birth)
                        : undefined
                    }
                    onSelect={handleDateSelect("date_of_birth")}
                    captionLayout="dropdown"
                    defaultMonth={
                      formValues.date_of_birth
                        ? (() => {
                            try {
                              return parseISO(formValues.date_of_birth);
                            } catch {
                              return new Date();
                            }
                          })()
                        : new Date()
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Nguồn</Label>
              <Select
                value={formValues.source}
                onValueChange={handleSelectChange("source")}
              >
                <SelectTrigger id="source" className="w-full">
                  <SelectValue placeholder="Chọn nguồn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CUSTOMER_SOURCE.WEBSITE}>
                    {customerSourceLabels[CUSTOMER_SOURCE.WEBSITE]}
                  </SelectItem>
                  <SelectItem value={CUSTOMER_SOURCE.AGODA}>
                    {customerSourceLabels[CUSTOMER_SOURCE.AGODA]}
                  </SelectItem>
                  <SelectItem value={CUSTOMER_SOURCE.BOOKING}>
                    {customerSourceLabels[CUSTOMER_SOURCE.BOOKING]}
                  </SelectItem>
                  <SelectItem value={CUSTOMER_SOURCE.TRAVELOKA}>
                    {customerSourceLabels[CUSTOMER_SOURCE.TRAVELOKA]}
                  </SelectItem>
                  <SelectItem value={CUSTOMER_SOURCE.OTHER}>
                    {customerSourceLabels[CUSTOMER_SOURCE.OTHER]}
                  </SelectItem>
                </SelectContent>
              </Select>
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
              {isSubmitting ? "Đang tạo..." : "Tạo khách hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

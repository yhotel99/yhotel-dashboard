"use client";

import { useState, useRef, useMemo, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import type { BookingInput, Customer, PaymentMethod } from "@/lib/types";
import type { RoomWithBooking } from "@/lib/types";
import { PAYMENT_METHOD, paymentMethodLabels } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCheckInDateISO,
  getCheckOutDateISO,
  calculateNightsValue,
  formatCurrency,
  formatDisplayDate,
} from "@/lib/functions";
import { useDebounce } from "@/hooks/use-debounce";
import { searchCustomersAction, createCustomerAction } from "@/actions/customers";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { useSettings } from "@/hooks/use-settings";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import {
  calculateTotalWithWeekdayRates,
  normalizeWeekdayRates,
} from "@/lib/pricing";

type QuickBookingFormState = {
  customer_id: string;
  check_in_date: string;
  check_out_date: string;
  total_guests: string;
  payment_method: string;
};

const initialFormState: QuickBookingFormState = {
  customer_id: "",
  check_in_date: "",
  check_out_date: "",
  total_guests: "1",
  payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
};

const SEARCH_CUSTOMER_MIN_LENGTH = 2;

export function QuickBookingDialog({
  open,
  onOpenChange,
  room,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomWithBooking;
  onCreate: (input: BookingInput) => Promise<void>;
}) {
  const { settings } = useSettings();
  const [formValues, setFormValues] =
    useState<QuickBookingFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isCreateCustomerDialogOpen, setIsCreateCustomerDialogOpen] =
    useState(false);
  const [searchCustomers, setSearchCustomers] = useState<Customer[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(customerSearch, 300);

  // Search customers using server action (no stats, only basic info)
  useEffect(() => {
    const searchCustomers = async () => {
      if (debouncedSearch.trim().length >= SEARCH_CUSTOMER_MIN_LENGTH) {
        const result = await searchCustomersAction(debouncedSearch, 10);
        if (result.ok) {
          setSearchCustomers(result.data);
        } else {
          setSearchCustomers([]);
        }
      } else {
        setSearchCustomers([]);
      }
    };

    searchCustomers();
  }, [debouncedSearch]);

  // Calculate if we should show search results
  const shouldShowResults =
    debouncedSearch.trim().length >= SEARCH_CUSTOMER_MIN_LENGTH &&
    !selectedCustomer;

  // Note: showSearchResults is now computed, so we don't need to manage it with state
  // The search results will automatically hide when selectedCustomer is set

  // Reset form when dialog opens - use key prop approach instead
  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFormValues(initialFormState);
      setError(null);
      setCustomerSearch("");
      setSelectedCustomer(null);
    }
    onOpenChange(newOpen);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormValues((prev) => ({ ...prev, customer_id: customer.id }));
    setCustomerSearch(
      `${customer.full_name}${customer.phone ? ` - ${customer.phone}` : ""}${customer.email ? ` (${customer.email})` : ""
      }`
    );
  };

  const handleCreateCustomerSuccess = (customer: Customer) => {
    handleCustomerSelect(customer);
    setIsCreateCustomerDialogOpen(false);
  };

  const handleDateSelect =
    (field: "check_in_date" | "check_out_date") => (date?: Date) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: date ? format(date, "yyyy-MM-dd") : "",
      }));
    };

  // Calculate number of nights and total amount (same day = 1 night, check-out 12h)
  const nightsAndAmount = useMemo(() => {
    if (!formValues.check_in_date || !formValues.check_out_date) {
      return { nights: 0, totalAmount: 0 };
    }

    const checkInISO = getCheckInDateISO(
      formValues.check_in_date,
      formValues.check_out_date
    );
    const checkOutISO = getCheckOutDateISO(
      formValues.check_in_date,
      formValues.check_out_date
    );

    if (!checkInISO || !checkOutISO) {
      return { nights: 0, totalAmount: 0 };
    }

    const nights = calculateNightsValue(checkInISO, checkOutISO);

    const weekdayRates = normalizeWeekdayRates(
      settings?.pricing_weekday_rates ?? undefined
    );
    const totalAmount =
      nights > 0
        ? calculateTotalWithWeekdayRates({
            basePrice: room.price_per_night,
            checkInDate: formValues.check_in_date,
            checkOutDate: formValues.check_out_date,
            weekdayRates,
          }).total
        : 0;

    return { nights, totalAmount };
  }, [
    formValues.check_in_date,
    formValues.check_out_date,
    room.price_per_night,
    settings?.pricing_weekday_rates,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formValues.customer_id) {
      setError("Vui lòng chọn khách hàng.");
      return;
    }

    // Cùng ngày: check-in 00:00, check-out 12:00
    const checkInISO = getCheckInDateISO(
      formValues.check_in_date,
      formValues.check_out_date
    );
    const checkOutISO = getCheckOutDateISO(
      formValues.check_in_date,
      formValues.check_out_date
    );

    if (!checkInISO || !checkOutISO) {
      setError("Vui lòng nhập đầy đủ ngày check-in và check-out.");
      return;
    }

    const number_of_nights = calculateNightsValue(checkInISO, checkOutISO);

    if (number_of_nights <= 0) {
      setError("Ngày check-out phải sau ngày check-in.");
      return;
    }

    const totalGuests = Number(formValues.total_guests);
    if (!Number.isFinite(totalGuests) || totalGuests < 1) {
      setError("Số khách phải là số nguyên dương.");
      return;
    }

    if (totalGuests > room.max_guests) {
      setError(`Số khách không được vượt quá ${room.max_guests} người.`);
      return;
    }

    const weekdayRates = normalizeWeekdayRates(
      settings?.pricing_weekday_rates ?? undefined
    );

    const totalAmount = calculateTotalWithWeekdayRates({
      basePrice: room.price_per_night,
      checkInDate: formValues.check_in_date,
      checkOutDate: formValues.check_out_date,
      weekdayRates,
    }).total;

    const payload: BookingInput = {
      customer_id: formValues.customer_id,
      room_id: room.id,
      check_in: checkInISO,
      check_out: checkOutISO,
      number_of_nights,
      total_guests: totalGuests,
      notes: null,
      total_amount: totalAmount,
      advance_payment: 0,
      final_amount: totalAmount,
      payment_method: formValues.payment_method as PaymentMethod,
    };

    try {
      setIsSubmitting(true);
      await onCreate(payload);
      onOpenChange(false);
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : "Không thể tạo booking";
      setError(rawMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đặt phòng nhanh - {room.name}</DialogTitle>
          <DialogDescription>
            Điền thông tin để đặt phòng nhanh cho khách hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_search">Khách hàng *</Label>
            <div className="relative" ref={searchInputRef}>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customer_search"
                  type="text"
                  placeholder="Nhập mã, Tên, SĐT khách hàng"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (e.target.value === "") {
                      setSelectedCustomer(null);
                      setFormValues((prev) => ({ ...prev, customer_id: "" }));
                    }
                  }}
                  className="pl-9 pr-20"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setIsCreateCustomerDialogOpen(true)}
                    title="Tạo khách hàng mới"
                  >
                    <IconPlus className="size-4" />
                  </Button>
                </div>
              </div>
              {shouldShowResults && searchCustomers.length > 0 && (
                <div
                  ref={searchResultsRef}
                  className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
                >
                  {searchCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <div className="font-medium">{customer.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.phone && `${customer.phone} • `}
                        {customer.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {shouldShowResults && searchCustomers.length === 0 && (
                <div
                  ref={searchResultsRef}
                  className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-md"
                >
                  Không tìm thấy khách hàng
                </div>
              )}
            </div>
            {selectedCustomer && (
              <p className="text-xs text-muted-foreground">
                Đã chọn: {selectedCustomer.full_name}
                {selectedCustomer.phone && ` - ${selectedCustomer.phone}`}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="check_in_date">Ngày check-in *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                >
                  {formatDisplayDate(formValues.check_in_date) || "Chọn ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <Calendar
                  mode="single"
                  selected={
                    formValues.check_in_date
                      ? parseISO(formValues.check_in_date)
                      : undefined
                  }
                  onSelect={handleDateSelect("check_in_date")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="check_out_date">Ngày check-out *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                >
                  {formatDisplayDate(formValues.check_out_date) || "Chọn ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <Calendar
                  mode="single"
                  selected={
                    formValues.check_out_date
                      ? parseISO(formValues.check_out_date)
                      : undefined
                  }
                  onSelect={handleDateSelect("check_out_date")}
                  disabled={(date) => {
                    if (!formValues.check_in_date) return false;
                    const checkIn = parseISO(formValues.check_in_date);
                    checkIn.setHours(0, 0, 0, 0);
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime() < checkIn.getTime();
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_guests">Số khách *</Label>
            <Input
              id="total_guests"
              type="number"
              min={1}
              max={room.max_guests}
              value={formValues.total_guests}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  total_guests: e.target.value,
                }))
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Tối đa: {room.max_guests} người
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Phương thức thanh toán *</Label>
            <Select
              value={formValues.payment_method}
              onValueChange={(v) =>
                setFormValues((prev) => ({ ...prev, payment_method: v }))
              }
            >
              <SelectTrigger id="payment_method" className="w-full">
                <SelectValue placeholder="Chọn phương thức thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PAYMENT_METHOD.PAY_AT_HOTEL}>
                  {paymentMethodLabels[PAYMENT_METHOD.PAY_AT_HOTEL]}
                </SelectItem>
                <SelectItem value={PAYMENT_METHOD.BANK_TRANSFER}>
                  {paymentMethodLabels[PAYMENT_METHOD.BANK_TRANSFER]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Display nights and total amount */}
          {formValues.check_in_date &&
            formValues.check_out_date &&
            nightsAndAmount.nights > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Số đêm:</span>
                  <span className="font-semibold">
                    {nightsAndAmount.nights} đêm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Tổng tiền:
                  </span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(nightsAndAmount.totalAmount)}
                  </span>
                </div>
              </div>
            )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo..." : "Đặt phòng"}
            </Button>
          </DialogFooter>
        </form>
        <CreateCustomerDialog
          open={isCreateCustomerDialogOpen}
          onOpenChange={setIsCreateCustomerDialogOpen}
          onCreate={async (input) => {
            const result = await createCustomerAction(input);
            if (result.ok) {
              handleCreateCustomerSuccess(result.data);
            } else {
              // Error is handled by CreateCustomerDialog
              throw new Error(result.message);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

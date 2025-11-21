"use client";

import { useState, useRef, useMemo, type FormEvent } from "react";
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
import type { BookingInput, Customer } from "@/lib/types";
import type { RoomWithBooking } from "@/lib/types";
import { getDateISO } from "@/lib/utils";
import { calculateNightsValue } from "@/lib/functions";
import { useCustomers } from "@/hooks/use-customers";
import { useDebounce } from "@/hooks/use-debounce";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";

type QuickBookingFormState = {
  customer_id: string;
  check_in_date: string;
  check_out_date: string;
  total_guests: string;
};

const initialFormState: QuickBookingFormState = {
  customer_id: "",
  check_in_date: "",
  check_out_date: "",
  total_guests: "1",
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(customerSearch, 300);
  // Use separate hook for search results
  const { customers: searchCustomers, createCustomer } = useCustomers(
    1,
    10,
    debouncedSearch.trim().length >= SEARCH_CUSTOMER_MIN_LENGTH
      ? debouncedSearch
      : ""
  );

  // Calculate search results and visibility
  const searchLength = customerSearch.trim().length;
  const debouncedLength = debouncedSearch.trim().length;
  const shouldShowResults =
    searchLength >= SEARCH_CUSTOMER_MIN_LENGTH &&
    debouncedLength >= SEARCH_CUSTOMER_MIN_LENGTH;

  // Memoize search results
  const searchResults = useMemo(() => {
    if (shouldShowResults) {
      return searchCustomers;
    }
    return [];
  }, [searchCustomers, shouldShowResults]);

  // Calculate if we should show search results (computed value, not state)
  const showSearchResults = shouldShowResults && !selectedCustomer;

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
      `${customer.full_name}${customer.phone ? ` - ${customer.phone}` : ""}${
        customer.email ? ` (${customer.email})` : ""
      }`
    );
  };

  const handleCreateCustomerSuccess = (customer: Customer) => {
    handleCustomerSelect(customer);
    setIsCreateCustomerDialogOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formValues.customer_id) {
      setError("Vui lòng chọn khách hàng.");
      return;
    }

    // Convert dates to ISO strings with default times
    const checkInISO = getDateISO(formValues.check_in_date, false);
    const checkOutISO = getDateISO(formValues.check_out_date, true);

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

    // Calculate total amount
    const totalAmount = room.price_per_night * number_of_nights;

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
              {!selectedCustomer &&
                showSearchResults &&
                searchResults.length > 0 && (
                  <div
                    ref={searchResultsRef}
                    className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
                  >
                    {searchResults.map((customer) => (
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
              {!selectedCustomer &&
                showSearchResults &&
                debouncedSearch.trim().length >= SEARCH_CUSTOMER_MIN_LENGTH &&
                searchResults.length === 0 && (
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
            <Input
              id="check_in_date"
              type="date"
              value={formValues.check_in_date}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  check_in_date: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="check_out_date">Ngày check-out *</Label>
            <Input
              id="check_out_date"
              type="date"
              value={formValues.check_out_date}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  check_out_date: e.target.value,
                }))
              }
              required
            />
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
            try {
              const newCustomer = await createCustomer(input);
              handleCreateCustomerSuccess(newCustomer);
            } catch (err) {
              // Error is handled by CreateCustomerDialog
              throw err;
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import type { BookingInput, PaymentMethod } from "@/lib/types";
import { useRooms } from "@/hooks/use-rooms";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { BranchFormField } from "@/components/branch-form-field";
import {
  buildBranchNameById,
  getBranchCodeById,
  getDefaultFormBranchId,
  resolveBranchDisplay,
} from "@/lib/branch";
import { CustomerSearchOption } from "@/components/customers/customer-search-option";
import { useSettings } from "@/hooks/use-settings";
import { searchCustomersAction, createCustomerAction } from "@/actions/customers";
import { validateVoucherForBooking } from "@/actions/vouchers";
import { useDebounce } from "@/hooks/use-debounce";
import { useVndAmountInput } from "@/hooks/use-vnd-amount-input";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import type { Customer, Room } from "@/lib/types";
import { PAYMENT_METHOD, paymentMethodLabels } from "@/lib/constants";
import {
  formatCurrency,
  getCheckInDateISO,
  getCheckOutDateISO,
  calculateNightsValue,
  translateBookingError,
  formatDisplayDate,
} from "@/lib/functions";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import {
  calculateTotalWithWeekdayRates,
  normalizeHolidayPeriods,
  normalizeWeekdayRates,
} from "@/lib/pricing";

type CreateBookingFormState = {
  customer_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  total_guests: string;
  total_amount: string;
  voucher_code: string;
  payment_method: string;
  notes: string;
};

const initialCreateBookingState: CreateBookingFormState = {
  customer_id: "",
  room_id: "",
  check_in_date: "",
  check_out_date: "",
  total_guests: "1",
  total_amount: "0",
  voucher_code: "",
  payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
  notes: "",
};

const SEARCH_CUSTOMER_MIN_LENGTH = 2;

// Validation function
function validateBookingForm({
  formValues,
  selectedCustomer,
  selectedRoom,
  nights,
  formBranchId,
  finalAmount,
  advancePayment,
}: {
  formValues: CreateBookingFormState;
  selectedCustomer: Customer | null;
  selectedRoom: Room | null;
  nights: number;
  formBranchId: string;
  finalAmount: number;
  advancePayment: number;
}): string | null {
  if (!formBranchId) {
    return "Vui lòng chọn chi nhánh trước khi tạo booking.";
  }

  if (
    selectedRoom?.branch_id &&
    selectedRoom.branch_id !== formBranchId
  ) {
    return "Phòng đã chọn không thuộc chi nhánh đang chọn.";
  }

  if (!selectedCustomer) {
    return "👤 Vui lòng chọn khách hàng trước khi tạo booking.";
  }

  if (!formValues.room_id) {
    return "🏠 Vui lòng chọn phòng trước khi tạo booking.";
  }

  if (!selectedRoom) {
    return "🏠 Phòng đã chọn không tồn tại hoặc không khả dụng.";
  }

  if (!formValues.check_in_date || !formValues.check_out_date) {
    return "📅 Vui lòng chọn đầy đủ ngày nhận phòng và trả phòng.";
  }

  if (nights <= 0) {
    return "📅 Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.";
  }

  const totalGuests = Number(formValues.total_guests);
  if (!Number.isFinite(totalGuests) || totalGuests < 1) {
    return "👥 Số lượng khách phải từ 1 người trở lên.";
  }

  if (totalGuests > selectedRoom.max_guests) {
    return `👥 Phòng này chỉ cho phép tối đa ${selectedRoom.max_guests} khách. Vui lòng chọn phòng khác hoặc giảm số khách.`;
  }

  const totalAmount = Number(formValues.total_amount || 0);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return "💰 Tổng tiền phải lớn hơn 0. Vui lòng kiểm tra giá phòng.";
  }

  const finalAmountResolved = finalAmount;
  if (!Number.isFinite(finalAmountResolved) || finalAmountResolved <= 0) {
    return "💰 Số tiền thanh toán cuối cùng phải lớn hơn 0.";
  }

  if (!Number.isFinite(advancePayment) || advancePayment < 0) {
    return "💰 Tiền cọc phải là số không âm.";
  }

  if (advancePayment > finalAmountResolved) {
    return "💰 Tiền cọc không được vượt quá số tiền thanh toán cuối cùng.";
  }

  return null;
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  onCreate,
  defaultRoomId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: BookingInput) => Promise<void>;
  defaultRoomId?: string;
}) {
  const [formValues, setFormValues] = useState<CreateBookingFormState>(
    initialCreateBookingState
  );
  const {
    amount: finalAmountValue,
    setDigits: setFinalAmountDigits,
    inputProps: finalAmountInputProps,
  } = useVndAmountInput();
  const {
    amount: advanceAmountValue,
    setDigits: setAdvancePaymentDigits,
    inputProps: advancePaymentInputProps,
  } = useVndAmountInput({ initialDigits: "0" });
  const [voucherState, setVoucherState] = useState<{
    code: string;
    discount: number;
    finalAmount: number;
  } | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
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
  const lastSearchRef = useRef<string>("");
  const { branches, filterBranchId, effectiveBranchId } = useBranch();
  const branchNameById = useMemo(
    () => buildBranchNameById(branches),
    [branches]
  );
  const { profile } = useAuth();
  const [formBranchId, setFormBranchId] = useState(() =>
    getDefaultFormBranchId({
      profile: null,
      filterBranchId: null,
      effectiveBranchId: null,
    })
  );
  const prevOpenRef = useRef(open);

  const { rooms, mutate: refetch } = useRooms({
    page: 1,
    limit: 20,
    search: "",
    branchId: formBranchId || null,
  });
  const { settings } = useSettings();
  const debouncedSearch = useDebounce(customerSearch, 300);

  // Fetch rooms when dialog opens or branch changes
  useEffect(() => {
    if (open && formBranchId) {
      refetch();
    }
  }, [open, formBranchId, refetch]);

  // Search customers using server action (no stats, only basic info)
  // Optimized to avoid unnecessary API calls
  useEffect(() => {
    const trimmedSearch = debouncedSearch.trim();

    if (
      trimmedSearch.length < SEARCH_CUSTOMER_MIN_LENGTH ||
      trimmedSearch === lastSearchRef.current
    ) {
      if (trimmedSearch.length < SEARCH_CUSTOMER_MIN_LENGTH) {
        setSearchCustomers([]);
      }
      return;
    }

    lastSearchRef.current = trimmedSearch;

    searchCustomersAction(trimmedSearch, 10, formBranchId).then((result) => {
      if (result.ok) {
        setSearchCustomers(result.data);
      } else {
        setSearchCustomers([]);
      }
    });
  }, [debouncedSearch, formBranchId]);

  const handleBranchChange = (branchId: string) => {
    setFormBranchId(branchId);
    setFormValues((prev) => ({
      ...prev,
      room_id: "",
    }));
    setVoucherState(null);
    lastSearchRef.current = "";
  };

  const checkInISO = useMemo(
    () =>
      getCheckInDateISO(
        formValues.check_in_date,
        formValues.check_out_date
      ),
    [formValues.check_in_date, formValues.check_out_date]
  );
  const checkOutISO = useMemo(
    () =>
      getCheckOutDateISO(
        formValues.check_in_date,
        formValues.check_out_date
      ),
    [formValues.check_in_date, formValues.check_out_date]
  );

  const nights = useMemo(
    () => calculateNightsValue(checkInISO || "", checkOutISO || ""),
    [checkInISO, checkOutISO]
  );

  // Get selected room with safe fallback
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === formValues.room_id) ?? null,
    [rooms, formValues.room_id]
  );

  // Calculate total amount from room price and nights
  const calculatedTotalAmount = useMemo(() => {
    if (!selectedRoom) return 0;
    if (!formValues.check_in_date || !formValues.check_out_date) return 0;

    const weekdayRates = normalizeWeekdayRates(
      settings?.pricing_weekday_rates ?? undefined
    );
    const holidayPeriods = normalizeHolidayPeriods(
      settings?.pricing_holiday_periods
    );

    const { total } = calculateTotalWithWeekdayRates({
      basePrice: selectedRoom.price_per_night,
      checkInDate: formValues.check_in_date,
      checkOutDate: formValues.check_out_date,
      weekdayRates,
      holidayPeriods,
    });

    return total;
  }, [
    selectedRoom,
    formValues.check_in_date,
    formValues.check_out_date,
    settings?.pricing_weekday_rates,
    settings?.pricing_holiday_periods,
  ]);

  // Check if room capacity is exceeded
  const isOverCapacity = useMemo(() => {
    if (selectedRoom && formValues.total_guests) {
      const guests = Number(formValues.total_guests);
      return guests > selectedRoom.max_guests;
    }
    return false;
  }, [selectedRoom, formValues.total_guests]);

  const pricingRevisionKey = `${calculatedTotalAmount}|${formValues.room_id}|${formValues.check_in_date}|${formValues.check_out_date}`;
  const prevPricingRevisionRef = useRef(pricingRevisionKey);

  // Auto-update total amount; clear stale voucher; cap advance when pricing changes
  useEffect(() => {
    if (calculatedTotalAmount > 0) {
      setFormValues((prev) => {
        const currentTotal = Number(prev.total_amount || 0);
        if (Math.abs(currentTotal - calculatedTotalAmount) > 0.01) {
          return {
            ...prev,
            total_amount: calculatedTotalAmount.toString(),
          };
        }
        return prev;
      });
    } else if (calculatedTotalAmount === 0 && formValues.room_id) {
      setFormValues((prev) => {
        if (prev.total_amount !== "0") {
          return {
            ...prev,
            total_amount: "0",
          };
        }
        return prev;
      });
    }

    const pricingChanged = prevPricingRevisionRef.current !== pricingRevisionKey;
    if (pricingChanged) {
      prevPricingRevisionRef.current = pricingRevisionKey;
      if (voucherState) {
        setVoucherState(null);
        setFinalAmountDigits("");
      }
    }

    const maxValue =
      (!pricingChanged && voucherState?.finalAmount != null
        ? voucherState.finalAmount
        : undefined) ??
      (finalAmountValue ||
        calculatedTotalAmount ||
        Number(formValues.total_amount || 0));
    if (advanceAmountValue > maxValue) {
      setAdvancePaymentDigits(String(maxValue));
    }
  }, [
    pricingRevisionKey,
    calculatedTotalAmount,
    formValues.room_id,
    formValues.check_in_date,
    formValues.check_out_date,
    formValues.total_amount,
    voucherState,
    finalAmountValue,
    advanceAmountValue,
    setAdvancePaymentDigits,
    setFinalAmountDigits,
  ]);

  // Calculate search results based on debounced search
  const displaySearchResults = useMemo(() => {
    if (debouncedSearch.trim().length >= SEARCH_CUSTOMER_MIN_LENGTH) {
      return searchCustomers;
    }
    return [];
  }, [searchCustomers, debouncedSearch]);

  const shouldShowSearchResults =
    debouncedSearch.trim().length >= SEARCH_CUSTOMER_MIN_LENGTH;

  const handleInputChange =
    (field: keyof CreateBookingFormState) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = event.target;
        setFormValues((prev) => ({ ...prev, [field]: value }));
      };

  const clearVoucher = useCallback(() => {
    setVoucherState(null);
    setFormValues((prev) => ({
      ...prev,
      voucher_code: "",
    }));
    setFinalAmountDigits("");
  }, [setFinalAmountDigits]);

  const resetForm = useCallback(() => {
    setFormValues(initialCreateBookingState);
    setFinalAmountDigits("");
    setAdvancePaymentDigits("0");
    setError(null);
    setIsSubmitting(false);
    setCustomerSearch("");
    setSelectedCustomer(null);
    lastSearchRef.current = "";
    setVoucherState(null);
    setIsApplyingVoucher(false);
  }, [setAdvancePaymentDigits, setFinalAmountDigits]);

  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    if (open) {
      setFormBranchId(
        getDefaultFormBranchId({
          profile,
          filterBranchId,
          effectiveBranchId,
        })
      );
      if (defaultRoomId) {
        setFormValues((prev) => ({
          ...prev,
          room_id: defaultRoomId,
        }));
      }
    } else {
      resetForm();
    }
  }

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

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleDateSelect =
    (field: "check_in_date" | "check_out_date") => (date?: Date) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: date ? format(date, "yyyy-MM-dd") : "",
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
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
        setError("📅 Định dạng ngày tháng không hợp lệ. Vui lòng chọn lại.");
        return;
      }

      const number_of_nights = calculateNightsValue(checkInISO, checkOutISO);

      // Re-check room in submit (safe fallback when rooms refetch)
      const submitSelectedRoom =
        rooms.find((room) => room.id === formValues.room_id) ?? null;

      // Validate form using validation function
      const validationError = validateBookingForm({
        formValues,
        selectedCustomer,
        selectedRoom: submitSelectedRoom,
        nights: number_of_nights,
        formBranchId,
        finalAmount: voucherState?.finalAmount ?? finalAmountValue,
        advancePayment: advanceAmountValue,
      });

      if (validationError) {
        setError(validationError);
        return;
      }

      // At this point, we know submitSelectedRoom is not null (validation passed)
      const totalGuests = Number(formValues.total_guests);
      const totalAmount = Number(formValues.total_amount || 0);
      const resolvedFinalAmount = voucherState?.finalAmount ?? finalAmountValue;

      const payload: BookingInput = {
        customer_id: formValues.customer_id,
        room_id: formValues.room_id,
        check_in: checkInISO,
        check_out: checkOutISO,
        number_of_nights,
        total_guests: totalGuests,
        notes: formValues.notes.trim() || null,
        total_amount: totalAmount,
        advance_payment: advanceAmountValue,
        final_amount: voucherState ? undefined : resolvedFinalAmount,
        voucher_code: voucherState ? voucherState.code : null,
        payment_method: formValues.payment_method as PaymentMethod,
        branch_code: getBranchCodeById(formBranchId, branches),
      };

      setIsSubmitting(true);
      await onCreate(payload);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error("Booking creation error:", err);

      const rawMessage =
        err instanceof Error ? err.message : "Không thể tạo booking";

      // Translate error messages to user-friendly format
      const message = translateBookingError(rawMessage);
      setError(message);
      setIsSubmitting(false);
      // Không đóng dialog để người dùng có thể chỉnh sửa
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-6xl">
        <DialogHeader>
          <DialogTitle>Tạo booking mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết để tạo booking mới cho khách hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BranchFormField
            value={formBranchId}
            onChange={handleBranchChange}
            className="md:col-span-2"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
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
                        setFormValues((prev) => ({
                          ...prev,
                          customer_id: "",
                        }));
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
                  shouldShowSearchResults &&
                  displaySearchResults.length > 0 && (
                    <div
                      ref={searchResultsRef}
                      className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
                    >
                      {displaySearchResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                        >
                          <CustomerSearchOption
                            customer={customer}
                            branchNameById={branchNameById}
                            bookingBranchId={formBranchId}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                {!selectedCustomer &&
                  shouldShowSearchResults &&
                  displaySearchResults.length === 0 && (
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
                  {selectedCustomer.branch_id &&
                  selectedCustomer.branch_id !== formBranchId
                    ? ` (CN gốc: ${resolveBranchDisplay(selectedCustomer.branch_id, branches).name})`
                    : null}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room_id">Chọn phòng *</Label>
              <Select
                value={formValues.room_id}
                onValueChange={(v) =>
                  setFormValues((prev) => ({ ...prev, room_id: v }))
                }
              >
                <SelectTrigger id="room_id" className="w-full">
                  <SelectValue placeholder="Chọn phòng" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="max-h-[300px]">
                    {rooms.length === 0 ? (
                      <SelectItem value="no_room" disabled>
                        Không có phòng
                      </SelectItem>
                    ) : (
                      rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} -{" "}
                          {new Intl.NumberFormat("vi-VN").format(
                            room.price_per_night
                          )}{" "}
                          VNĐ/đêm
                        </SelectItem>
                      ))
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_guests">Số khách *</Label>
              <Input
                id="total_guests"
                type="number"
                min={1}
                value={formValues.total_guests}
                onChange={handleInputChange("total_guests")}
                className={isOverCapacity ? "border-destructive" : ""}
              />
              {selectedRoom && (
                <p className="text-xs text-muted-foreground">
                  Phòng này cho phép tối đa {selectedRoom.max_guests} khách
                  {isOverCapacity && (
                    <span className="text-destructive font-medium">
                      {" "}
                      • Vượt quá sức chứa!
                    </span>
                  )}
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
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_out_date">
                Ngày check-out * {nights > 0 ? `(${nights} đêm)` : ""}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                  >
                    {formatDisplayDate(formValues.check_out_date) ||
                      "Chọn ngày"}
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
              <Label htmlFor="total_amount">Tổng tiền (VNĐ) *</Label>
              <Input
                id="total_amount"
                type="number"
                min={0}
                step="1000"
                value={formValues.total_amount}
                onChange={handleInputChange("total_amount")}
                className="bg-muted"
                readOnly
              />
              {selectedRoom && nights > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(formValues.total_amount || 0))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="final_amount">Số tiền thanh toán cuối cùng (VNĐ)</Label>
              <Input
                id="final_amount"
                {...finalAmountInputProps}
                placeholder="Mặc định bằng tổng tiền phía trên, có thể chỉnh khi giảm giá/phụ thu"
                readOnly={!!voucherState}
                className={voucherState ? "bg-muted" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {voucherState
                  ? `Đang áp dụng voucher: giảm ${formatCurrency(voucherState.discount)}. Số tiền cuối: ${formatCurrency(voucherState.finalAmount)}.`
                  : "Đây là số tiền khách sẽ thực sự thanh toán sau cùng."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voucher_code">Mã voucher</Label>
              <div className="flex gap-2">
                <Input
                  id="voucher_code"
                  type="text"
                  value={formValues.voucher_code}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, voucher_code: e.target.value }))
                  }
                  placeholder="VD: SUMMER2026"
                  disabled={isApplyingVoucher || !!voucherState}
                />
                {voucherState ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearVoucher}
                    disabled={isApplyingVoucher}
                  >
                    Xóa
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        setError(null);
                        const code = formValues.voucher_code.trim();
                        if (!code) {
                          setError("Vui lòng nhập mã voucher.");
                          return;
                        }
                        const total = Number(formValues.total_amount || 0);
                        if (!Number.isFinite(total) || total <= 0) {
                          setError("Tổng tiền không hợp lệ để áp dụng voucher.");
                          return;
                        }
                        setIsApplyingVoucher(true);
                        const result = await validateVoucherForBooking({
                          code,
                          totalAmount: total,
                          branchId: formBranchId,
                          roomId: formValues.room_id || undefined,
                        });
                        if (!result.ok) {
                          setError(result.message);
                          return;
                        }
                        setVoucherState({
                          code: result.data.voucher.code,
                          discount: result.data.discount,
                          finalAmount: result.data.finalAmount,
                        });
                        setFormValues((prev) => ({
                          ...prev,
                          voucher_code: result.data.voucher.code,
                        }));
                        setFinalAmountDigits(String(result.data.finalAmount));
                        if (advanceAmountValue > result.data.finalAmount) {
                          setAdvancePaymentDigits(String(result.data.finalAmount));
                        }
                      } finally {
                        setIsApplyingVoucher(false);
                      }
                    }}
                    disabled={isApplyingVoucher}
                  >
                    {isApplyingVoucher ? "Đang áp dụng..." : "Áp dụng"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Voucher sẽ được kiểm tra hiệu lực và tính giảm giá tự động.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance_payment">Tiền cọc (VNĐ)</Label>
              <Input
                id="advance_payment"
                {...advancePaymentInputProps}
                placeholder="Nhập số tiền cọc (VD: 1.000.000)"
              />
              <p className="text-xs text-muted-foreground">
                Tối đa:{" "}
                {formatCurrency(
                  voucherState?.finalAmount ??
                    (finalAmountValue || Number(formValues.total_amount || 0))
                )}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="Thông tin ghi chú thêm cho booking"
              value={formValues.notes}
              onChange={handleInputChange("notes")}
            />
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
              disabled={
                isSubmitting ||
                !selectedCustomer ||
                !formValues.room_id ||
                nights <= 0
              }
              className="min-w-[140px]"
            >
              {isSubmitting ? "Đang tạo..." : "Tạo booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {isCreateCustomerDialogOpen && (
        <CreateCustomerDialog
          open={isCreateCustomerDialogOpen}
          onOpenChange={setIsCreateCustomerDialogOpen}
          defaultBranchId={formBranchId}
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
      )}
    </Dialog>
  );
}

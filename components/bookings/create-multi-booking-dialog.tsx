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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconSearch, IconPlus, IconEye } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DailyPricingBreakdownItem,
  MultiBookingInput,
  PaymentMethod,
} from "@/lib/types";
import { getAvailableRoomsAction } from "@/actions/rooms";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { BranchFormField } from "@/components/branch-form-field";
import {
  buildBranchNameById,
  canViewAllBranches,
  getBranchCodeById,
  getDefaultFormBranchId,
  resolveBranchDisplay,
} from "@/lib/branch";
import { CustomerSearchOption } from "@/components/customers/customer-search-option";
import { searchCustomersAction, createCustomerAction } from "@/actions/customers";
import { validateVoucherForBooking } from "@/actions/vouchers";
import { useDebounce } from "@/hooks/use-debounce";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { RoomDetailDialog } from "@/components/rooms/room-detail-dialog";
import type { Customer, Room } from "@/lib/types";
import {
  PAYMENT_METHOD,
  paymentMethodLabels,
  roomTypeLabels,
} from "@/lib/constants";
import {
  formatCurrency,
  getCheckInDateISO,
  getCheckOutDateISO,
  calculateNightsValue,
  translateBookingError,
  formatNumberWithSeparators,
  parseFormattedNumber,
  formatDisplayDate,
} from "@/lib/functions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/hooks/use-settings";
import {
  calculateTotalWithWeekdayRates,
  normalizeHolidayPeriods,
  normalizeWeekdayRates,
} from "@/lib/pricing";

type SelectedRoom = {
  room: Room;
  amount: number;
  breakdown: DailyPricingBreakdownItem[];
};

const SEARCH_CUSTOMER_MIN_LENGTH = 2;

export function CreateMultiBookingDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: MultiBookingInput) => Promise<void>;
}) {
  const { branches, filterBranchId, effectiveBranchId } = useBranch();
  const { profile } = useAuth();
  const [formBranchId, setFormBranchId] = useState(() =>
    getDefaultFormBranchId({
      profile: null,
      filterBranchId: null,
      effectiveBranchId: null,
    })
  );
  const { settings } = useSettings();

  useEffect(() => {
    if (open) {
      setFormBranchId(
        getDefaultFormBranchId({
          profile,
          filterBranchId,
          effectiveBranchId,
        })
      );
    }
  }, [open, profile, filterBranchId, effectiveBranchId]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isCreateCustomerDialogOpen, setIsCreateCustomerDialogOpen] =
    useState(false);
  const [searchCustomers, setSearchCustomers] = useState<Customer[]>([]);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [totalGuests, setTotalGuests] = useState("1");
  const [advancePayment, setAdvancePayment] = useState("0");
  const [finalAmount, setFinalAmount] = useState("");
  const [isFinalAmountDirty, setIsFinalAmountDirty] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherState, setVoucherState] = useState<{
    code: string;
    discount: number;
    finalAmount: number;
  } | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PAYMENT_METHOD.BANK_TRANSFER
  );
  const [notes, setNotes] = useState("");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<Room | null>(null);
  const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false);
  const lastSearchRef = useRef<string>("");
  const debouncedSearch = useDebounce(customerSearch, 300);

  const checkInISO = useMemo(
    () => getCheckInDateISO(checkInDate, checkOutDate),
    [checkInDate, checkOutDate]
  );
  const checkOutISO = useMemo(
    () => getCheckOutDateISO(checkInDate, checkOutDate),
    [checkInDate, checkOutDate]
  );
  const nights = useMemo(
    () => calculateNightsValue(checkInISO || "", checkOutISO || ""),
    [checkInISO, checkOutISO]
  );

  const canSelectBookingBranch = Boolean(
    profile && canViewAllBranches(profile.role)
  );

  const staffLockedBranchId = useMemo(() => {
    if (!profile || canViewAllBranches(profile.role)) return null;
    return profile.branch_id ?? null;
  }, [profile]);

  const branchIdForBooking = staffLockedBranchId ?? formBranchId;

  const branchNameById = useMemo(
    () => buildBranchNameById(branches),
    [branches]
  );

  const branchLabelForRooms = useMemo(() => {
    if (!branchIdForBooking) return null;
    return resolveBranchDisplay(branchIdForBooking, branches).name;
  }, [branchIdForBooking, branches]);

  const availableRoomsForBranch = useMemo(() => {
    if (!branchIdForBooking) return [];
    return availableRooms.filter((r) => r.branch_id === branchIdForBooking);
  }, [availableRooms, branchIdForBooking]);

  const roomGroupsByBranch = useMemo(() => {
    const groups = new Map<string, Room[]>();
    for (const room of availableRoomsForBranch) {
      const key = room.branch_id || branchIdForBooking;
      const list = groups.get(key) ?? [];
      list.push(room);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([branchId, rooms]) => ({
      branchId,
      branchName:
        branchNameById[branchId] ??
        resolveBranchDisplay(branchId, branches).name,
      rooms,
    }));
  }, [
    availableRoomsForBranch,
    branchIdForBooking,
    branchNameById,
    branches,
  ]);

  useEffect(() => {
    if (staffLockedBranchId && formBranchId !== staffLockedBranchId) {
      setFormBranchId(staffLockedBranchId);
    }
  }, [staffLockedBranchId, formBranchId]);

  // Danh sách phòng trống theo chi nhánh + khoảng ngày (RPC get_available_rooms)
  useEffect(() => {
    if (!branchIdForBooking || !checkInISO || !checkOutISO || nights <= 0) {
      setAvailableRooms([]);
      setSelectedRoomIds(new Set());
      return;
    }
    setIsLoadingRooms(true);
    getAvailableRoomsAction(checkInISO, checkOutISO, branchIdForBooking).then(
      (result) => {
        setIsLoadingRooms(false);
        if (result.ok) {
          setAvailableRooms(
            result.data.filter((r) => r.branch_id === branchIdForBooking)
          );
          setSelectedRoomIds(new Set());
        } else {
          setAvailableRooms([]);
        }
      }
    );
  }, [checkInISO, checkOutISO, nights, branchIdForBooking]);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (
      trimmed.length < SEARCH_CUSTOMER_MIN_LENGTH ||
      trimmed === lastSearchRef.current
    ) {
      if (trimmed.length < SEARCH_CUSTOMER_MIN_LENGTH) setSearchCustomers([]);
      return;
    }
    lastSearchRef.current = trimmed;
    searchCustomersAction(trimmed, 10, branchIdForBooking).then((result) => {
      if (result.ok) setSearchCustomers(result.data);
      else setSearchCustomers([]);
    });
  }, [debouncedSearch, branchIdForBooking]);

  const handleBranchChange = (branchId: string) => {
    setFormBranchId(branchId);
    setSelectedRoomIds(new Set());
    setAvailableRooms([]);
    lastSearchRef.current = "";
  };

  const selectedRoomsWithAmounts = useMemo((): SelectedRoom[] => {
    const weekdayRates = normalizeWeekdayRates(
      settings?.pricing_weekday_rates ?? undefined
    );
    const holidayPeriods = normalizeHolidayPeriods(
      settings?.pricing_holiday_periods
    );
    return availableRoomsForBranch
      .filter((r) => selectedRoomIds.has(r.id))
      .map((r) => {
        if (!checkInDate || !checkOutDate || nights <= 0) {
          return { room: r, amount: 0, breakdown: [] };
        }
        const calc = calculateTotalWithWeekdayRates({
          basePrice: r.price_per_night,
          checkInDate,
          checkOutDate,
          weekdayRates,
          holidayPeriods,
        });
        return {
          room: r,
          amount: calc.total,
          breakdown: calc.breakdown,
        };
      });
  }, [
    availableRoomsForBranch,
    selectedRoomIds,
    nights,
    checkInDate,
    checkOutDate,
    settings?.pricing_weekday_rates,
    settings?.pricing_holiday_periods,
  ]);

  const totalAmount = useMemo(
    () => selectedRoomsWithAmounts.reduce((s, x) => s + x.amount, 0),
    [selectedRoomsWithAmounts]
  );

  useEffect(() => {
    if (!isFinalAmountDirty) {
      if (totalAmount > 0) {
        setFinalAmount(formatNumberWithSeparators(String(totalAmount)));
      } else {
        setFinalAmount("");
      }
    }
  }, [totalAmount, isFinalAmountDirty]);

  // Clear applied voucher when total changes
  useEffect(() => {
    if (voucherState) {
      setVoucherState(null);
      setIsApplyingVoucher(false);
      setVoucherCode("");
      setIsFinalAmountDirty(false);
      if (totalAmount > 0) setFinalAmount(formatNumberWithSeparators(String(totalAmount)));
      else setFinalAmount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, checkInDate, checkOutDate, selectedRoomIds.size]);

  const toggleRoom = useCallback((roomId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    setCustomerSearch("");
    setSelectedCustomer(null);
    setCheckInDate("");
    setCheckOutDate("");
    setTotalGuests("1");
    setAdvancePayment("0");
    setFinalAmount("");
    setIsFinalAmountDirty(false);
    setVoucherCode("");
    setVoucherState(null);
    setIsApplyingVoucher(false);
    setPaymentMethod(PAYMENT_METHOD.PAY_AT_HOTEL);
    setNotes("");
    setAvailableRooms([]);
    setSelectedRoomIds(new Set());
    setError(null);
    lastSearchRef.current = "";
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(
      `${customer.full_name}${customer.phone ? ` - ${customer.phone}` : ""}${customer.email ? ` (${customer.email})` : ""}`
    );
  };

  const handleDateSelect =
    (field: "check_in" | "check_out") => (date?: Date) => {
      if (field === "check_in") setCheckInDate(date ? format(date, "yyyy-MM-dd") : "");
      else setCheckOutDate(date ? format(date, "yyyy-MM-dd") : "");
    };

  const handleViewRoomDetail = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRoomForDetail(room);
    setIsRoomDetailOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!branchIdForBooking) {
      setError("Vui lòng chọn chi nhánh");
      return;
    }
    if (!selectedCustomer) {
      setError("Vui lòng chọn khách hàng");
      return;
    }
    const roomBranchMismatch = selectedRoomsWithAmounts.some(
      (item) =>
        item.room.branch_id && item.room.branch_id !== branchIdForBooking
    );
    if (roomBranchMismatch) {
      setError("Một hoặc nhiều phòng không thuộc chi nhánh đang chọn");
      return;
    }
    if (selectedRoomsWithAmounts.length === 0) {
      setError("Vui lòng chọn ít nhất một phòng");
      return;
    }
    if (!checkInISO || !checkOutISO || nights <= 0) {
      setError("Vui lòng chọn ngày check-in và check-out hợp lệ");
      return;
    }
    const guests = Number(totalGuests);
    if (!Number.isFinite(guests) || guests < 1) {
      setError("Số khách phải từ 1 trở lên");
      return;
    }
    const finalAmountValue = voucherState
      ? voucherState.finalAmount
      : parseFormattedNumber(finalAmount || "0");
    if (finalAmountValue <= 0) {
      setError("Số tiền thanh toán cuối cùng phải lớn hơn 0");
      return;
    }
    const advance = parseFormattedNumber(advancePayment || "0");
    if (advance < 0 || advance > finalAmountValue) {
      setError("Tiền cọc không hợp lệ (không được lớn hơn số tiền thanh toán cuối cùng)");
      return;
    }

    const payload: MultiBookingInput = {
      customer_id: selectedCustomer.id,
      room_items: selectedRoomsWithAmounts.map(({ room, amount }) => ({
        room_id: room.id,
        amount,
      })),
      check_in: checkInISO,
      check_out: checkOutISO,
      number_of_nights: nights,
      total_guests: guests,
      notes: notes.trim() || null,
      payment_method: paymentMethod as PaymentMethod,
      advance_payment: advance,
      final_amount: voucherState ? undefined : finalAmountValue,
      voucher_code: voucherState ? voucherState.code : null,
      branch_code: getBranchCodeById(branchIdForBooking, branches),
    };

    setIsSubmitting(true);
    try {
      await onCreate(payload);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Không thể tạo booking";
      setError(translateBookingError(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displaySearchResults =
    debouncedSearch.trim().length >= SEARCH_CUSTOMER_MIN_LENGTH
      ? searchCustomers
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          "flex max-h-[90vh] w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1280px)]"
        }
      >
        <div className="shrink-0 border-b px-6 pb-4 pt-6 pr-14">
          <DialogHeader className="text-left">
            <DialogTitle>Đặt nhiều phòng - Thanh toán 1 lần</DialogTitle>
            <DialogDescription>
              Chọn ngày, nhiều phòng trống, thanh toán gộp một lần cho toàn bộ đơn.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-12">
            {/* Cột trái: khách, ngày, danh sách phòng */}
            <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto border-b p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
              <BranchFormField
                value={formBranchId}
                onChange={handleBranchChange}
                mode={canSelectBookingBranch ? "select" : "readonly"}
                lockedBranchId={staffLockedBranchId}
              />
              <div className="space-y-2 relative shrink-0">
                <Label>Khách hàng *</Label>
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nhập tên, SĐT khách hàng"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (!e.target.value) {
                        setSelectedCustomer(null);
                      }
                    }}
                    className="pl-9 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                    onClick={() => setIsCreateCustomerDialogOpen(true)}
                    title="Tạo khách hàng mới"
                  >
                    <IconPlus className="size-4" />
                  </Button>
                </div>
                {selectedCustomer && (
                  <p className="text-xs text-muted-foreground">
                    Đã chọn: {selectedCustomer.full_name}
                    {selectedCustomer.phone && ` - ${selectedCustomer.phone}`}
                    {selectedCustomer.branch_id &&
                    selectedCustomer.branch_id !== branchIdForBooking
                      ? ` (CN gốc: ${resolveBranchDisplay(selectedCustomer.branch_id, branches).name})`
                      : null}
                  </p>
                )}
                {displaySearchResults.length > 0 && !selectedCustomer && (
                  <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-xl">
                    {displaySearchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCustomerSelect(c)}
                        className="w-full px-4 py-3 text-left hover:bg-accent"
                      >
                        <CustomerSearchOption
                          customer={c}
                          branchNameById={branchNameById}
                          bookingBranchId={branchIdForBooking}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid shrink-0 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ngày check-in *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        {formatDisplayDate(checkInDate) || "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-2">
                      <Calendar
                        mode="single"
                        selected={checkInDate ? parseISO(checkInDate) : undefined}
                        onSelect={handleDateSelect("check_in")}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>
                    Ngày check-out * {nights > 0 ? `(${nights} đêm)` : ""}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        {formatDisplayDate(checkOutDate) || "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-2">
                      <Calendar
                        mode="single"
                        selected={checkOutDate ? parseISO(checkOutDate) : undefined}
                        onSelect={handleDateSelect("check_out")}
                        disabled={(d) => {
                          if (!checkInDate) return false;
                          const checkIn = parseISO(checkInDate);
                          checkIn.setHours(0, 0, 0, 0);
                          const day = new Date(d);
                          day.setHours(0, 0, 0, 0);
                          return day.getTime() < checkIn.getTime();
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 sm:col-span-1">
                  <Label>Số khách *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={totalGuests}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setTotalGuests(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="payment_method">Phương thức thanh toán</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  >
                    <SelectTrigger id="payment_method" className="w-full">
                      <SelectValue placeholder="Chọn phương thức thanh toán" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PAYMENT_METHOD.BANK_TRANSFER}>
                        {paymentMethodLabels[PAYMENT_METHOD.BANK_TRANSFER]}
                      </SelectItem>
                      <SelectItem value={PAYMENT_METHOD.PAY_AT_HOTEL}>
                        {paymentMethodLabels[PAYMENT_METHOD.PAY_AT_HOTEL]}
                      </SelectItem>
                      <SelectItem value={PAYMENT_METHOD.EXTERNAL}>
                        {paymentMethodLabels[PAYMENT_METHOD.EXTERNAL]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col space-y-2">
                <Label>Chọn phòng trống *</Label>
                <p className="text-xs text-muted-foreground">
                  {branchLabelForRooms
                    ? `Chỉ hiển thị phòng trống tại chi nhánh ${branchLabelForRooms} trong khoảng ngày đã chọn.`
                    : "Vui lòng chọn chi nhánh trước khi xem phòng trống."}
                </p>
                {!branchIdForBooking ? (
                  <p className="text-sm text-muted-foreground">
                    Vui lòng chọn chi nhánh trước
                  </p>
                ) : !checkInISO || !checkOutISO || nights <= 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Vui lòng chọn ngày check-in và check-out trước
                  </p>
                ) : isLoadingRooms ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="size-5 animate-spin" />
                    <span>Đang tải danh sách phòng trống...</span>
                  </div>
                ) : availableRoomsForBranch.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Không có phòng trống tại chi nhánh này trong khoảng thời gian
                    đã chọn
                  </p>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden">
                    <ScrollArea className="h-[min(42vh,420px)] min-h-[240px] rounded-md border">
                      <div className="space-y-4 p-3">
                        {roomGroupsByBranch.map((group) => (
                          <div key={group.branchId} className="space-y-2">
                            {roomGroupsByBranch.length > 1 ? (
                              <p className="text-xs font-medium text-muted-foreground">
                                {group.branchName}
                              </p>
                            ) : null}
                            {group.rooms.map((room) => (
                          <div
                            key={room.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                            onClick={() => toggleRoom(room.id)}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedRoomIds.has(room.id)}
                                onCheckedChange={() => toggleRoom(room.id)}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{room.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {room.room_number && (
                                  <span>
                                    Số phòng: <strong>{room.room_number}</strong> •{" "}
                                  </span>
                                )}
                                {room.floor_number !== null &&
                                  room.floor_number !== undefined && (
                                    <span>
                                      Tầng <strong>{room.floor_number}</strong> •{" "}
                                    </span>
                                  )}
                                <strong>{roomTypeLabels[room.room_type]}</strong> • Tối đa{" "}
                                {room.max_guests} khách
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 text-right">
                              <div>
                                <div className="font-semibold">
                                  {formatCurrency(room.price_per_night)}/đêm
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Giá gốc: {nights} đêm ={" "}
                                  {formatCurrency(room.price_per_night * nights)}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                onClick={(e) => handleViewRoomDetail(room, e)}
                                title="Xem chi tiết phòng"
                              >
                                <IconEye className="size-4" />
                              </Button>
                            </div>
                          </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: tổng tiền, thanh toán, voucher */}
            <div className="flex max-h-[min(90vh,720px)] min-h-0 flex-col gap-4 overflow-y-auto p-6 lg:col-span-5 lg:max-h-none">
              {selectedRoomsWithAmounts.length > 0 ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Chi tiết và tổng tiền</p>
                  <div className="space-y-1 text-sm">
                    {selectedRoomsWithAmounts.map(({ room, amount, breakdown }) => (
                      <div key={room.id} className="space-y-2">
                        <div className="flex justify-between gap-2">
                          <span className="min-w-0 truncate">{room.name}</span>
                          <span className="shrink-0">{formatCurrency(amount)}</span>
                        </div>
                        {breakdown.length > 0 && (
                          <div className="rounded-md border bg-background/70">
                            <div className="grid grid-cols-12 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                              <div className="col-span-4">Ngày</div>
                              <div className="col-span-2 text-right">%</div>
                              <div className="col-span-3 text-right">Giá</div>
                              <div className="col-span-3">Ghi chú</div>
                            </div>
                            {breakdown.map((d) => (
                              <div
                                key={`${room.id}-${d.date}`}
                                className="grid grid-cols-12 border-t px-2 py-1 text-[11px]"
                              >
                                <div className="col-span-4">
                                  {formatDisplayDate(d.date)}
                                </div>
                                <div className="col-span-2 text-right">+{d.percent}%</div>
                                <div className="col-span-3 text-right">
                                  {formatCurrency(d.price)}
                                </div>
                                <div className="col-span-3 text-muted-foreground">
                                  {d.holiday_label ? `Lễ: ${d.holiday_label}` : "Theo thứ"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Tổng cộng (đã áp dụng theo thứ/lễ)</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    {voucherState ? (
                      <>
                        <div className="flex justify-between">
                          <span>Giảm voucher ({voucherState.code})</span>
                          <span>-{formatCurrency(voucherState.discount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Thành tiền</span>
                          <span>{formatCurrency(voucherState.finalAmount)}</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                  Chọn ít nhất một phòng bên trái để xem chi tiết giá và thanh toán.
                </div>
              )}

              <div className="space-y-2 shrink-0">
                <Label>Số tiền thanh toán cuối cùng (VNĐ)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={finalAmount}
                  onChange={(e) => {
                    setIsFinalAmountDirty(true);
                    setFinalAmount(formatNumberWithSeparators(e.target.value));
                  }}
                  placeholder="Mặc định bằng tổng cộng phía trên"
                  readOnly={!!voucherState}
                  className={voucherState ? "bg-muted" : undefined}
                />
                <p className="text-xs text-muted-foreground">
                  {voucherState
                    ? `Đang áp dụng voucher: giảm ${formatCurrency(voucherState.discount)}.`
                    : "Đây là số tiền khách sẽ thanh toán sau cùng cho toàn bộ booking."}
                </p>
              </div>

              <div className="space-y-2 shrink-0">
                <Label>Mã voucher</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="VD: SUMMER2026"
                    disabled={isApplyingVoucher || !!voucherState}
                    className="min-w-0 flex-1"
                  />
                  {voucherState ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        setVoucherState(null);
                        setVoucherCode("");
                        setIsFinalAmountDirty(false);
                        if (totalAmount > 0)
                          setFinalAmount(formatNumberWithSeparators(String(totalAmount)));
                        else setFinalAmount("");
                      }}
                      disabled={isApplyingVoucher}
                    >
                      Xóa
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="shrink-0"
                      onClick={async () => {
                        try {
                          setError(null);
                          const code = voucherCode.trim();
                          if (!code) {
                            setError("Vui lòng nhập mã voucher.");
                            return;
                          }
                          if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
                            setError("Tổng tiền không hợp lệ để áp dụng voucher.");
                            return;
                          }
                          setIsApplyingVoucher(true);
                          const result = await validateVoucherForBooking({
                            code,
                            totalAmount,
                            branchId: branchIdForBooking,
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
                          setVoucherCode(result.data.voucher.code);
                          setIsFinalAmountDirty(false);
                          setFinalAmount(
                            formatNumberWithSeparators(String(result.data.finalAmount))
                          );
                          const adv = parseFormattedNumber(advancePayment || "0");
                          if (adv > result.data.finalAmount) {
                            setAdvancePayment(
                              formatNumberWithSeparators(String(result.data.finalAmount))
                            );
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
              </div>

              <div className="space-y-2 shrink-0">
                <Label>Tiền cọc (VNĐ)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={advancePayment}
                  onChange={(e) =>
                    setAdvancePayment(formatNumberWithSeparators(e.target.value))
                  }
                  placeholder="VD: 1.000.000"
                />
                <p className="text-xs text-muted-foreground">
                  Tối đa:{" "}
                  {formatCurrency(
                    parseFormattedNumber(finalAmount || "0") || totalAmount
                  )}
                </p>
              </div>

              <div className="space-y-2 shrink-0">
                <Label>Ghi chú</Label>
                <Textarea
                  value={notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(e.target.value)
                  }
                  placeholder="Ghi chú cho đơn đặt phòng"
                  className="min-h-[88px] resize-y"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive shrink-0">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedCustomer ||
                selectedRoomsWithAmounts.length === 0 ||
                nights <= 0
              }
            >
              {isSubmitting ? "Đang tạo..." : "Đặt phòng & thanh toán"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {isCreateCustomerDialogOpen && (
        <CreateCustomerDialog
          open={isCreateCustomerDialogOpen}
          onOpenChange={setIsCreateCustomerDialogOpen}
          defaultBranchId={branchIdForBooking}
          onCreate={async (input) => {
            const result = await createCustomerAction(input);
            if (result.ok) {
              handleCustomerSelect(result.data);
              setIsCreateCustomerDialogOpen(false);
            } else throw new Error(result.message);
          }}
        />
      )}

      {selectedRoomForDetail && (
        <RoomDetailDialog
          room={selectedRoomForDetail}
          open={isRoomDetailOpen}
          onOpenChange={(open) => {
            setIsRoomDetailOpen(open);
            if (!open) {
              setSelectedRoomForDetail(null);
            }
          }}
        />
      )}
    </Dialog>
  );
}

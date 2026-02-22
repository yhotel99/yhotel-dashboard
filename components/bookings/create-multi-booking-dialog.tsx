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
import { IconSearch, IconPlus } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MultiBookingInput, PaymentMethod } from "@/lib/types";
import { getAvailableRoomsAction } from "@/actions/rooms";
import { searchCustomersAction, createCustomerAction } from "@/actions/customers";
import { useDebounce } from "@/hooks/use-debounce";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import type { Customer, Room } from "@/lib/types";
import {
  PAYMENT_METHOD,
  paymentMethodLabels,
  roomTypeLabels,
} from "@/lib/constants";
import {
  formatCurrency,
  getDateISO,
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

type SelectedRoom = { room: Room; amount: number };

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PAYMENT_METHOD.PAY_AT_HOTEL
  );
  const [notes, setNotes] = useState("");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSearchRef = useRef<string>("");
  const debouncedSearch = useDebounce(customerSearch, 300);

  const checkInISO = useMemo(
    () => getDateISO(checkInDate, false),
    [checkInDate]
  );
  const checkOutISO = useMemo(
    () => getDateISO(checkOutDate, true),
    [checkOutDate]
  );
  const nights = useMemo(
    () => calculateNightsValue(checkInISO || "", checkOutISO || ""),
    [checkInISO, checkOutISO]
  );

  // Danh sách phòng trống theo khoảng ngày (RPC get_available_rooms - dùng booking_rooms)
  useEffect(() => {
    if (!checkInISO || !checkOutISO || nights <= 0) {
      setAvailableRooms([]);
      setSelectedRoomIds(new Set());
      return;
    }
    setIsLoadingRooms(true);
    getAvailableRoomsAction(checkInISO, checkOutISO).then((result) => {
      setIsLoadingRooms(false);
      if (result.ok) {
        setAvailableRooms(result.data);
        setSelectedRoomIds(new Set());
      } else {
        setAvailableRooms([]);
      }
    });
  }, [checkInISO, checkOutISO, nights]);

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
    searchCustomersAction(trimmed, 10).then((result) => {
      if (result.ok) setSearchCustomers(result.data);
      else setSearchCustomers([]);
    });
  }, [debouncedSearch]);

  const selectedRoomsWithAmounts = useMemo((): SelectedRoom[] => {
    return availableRooms
      .filter((r) => selectedRoomIds.has(r.id))
      .map((r) => ({
        room: r,
        amount: r.price_per_night * nights,
      }));
  }, [availableRooms, selectedRoomIds, nights]);

  const totalAmount = useMemo(
    () => selectedRoomsWithAmounts.reduce((s, x) => s + x.amount, 0),
    [selectedRoomsWithAmounts]
  );

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomer) {
      setError("Vui lòng chọn khách hàng");
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
    const advance = parseFormattedNumber(advancePayment || "0");
    if (advance < 0 || advance > totalAmount) {
      setError("Tiền cọc không hợp lệ");
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
      <DialogContent className="min-w-2xl max-w-4xl max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Đặt nhiều phòng - Thanh toán 1 lần</DialogTitle>
          <DialogDescription>
            Chọn ngày, nhiều phòng trống, thanh toán gộp một lần cho toàn bộ đơn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
          <div className="grid gap-4 md:grid-cols-2 shrink-0">
            <div className="space-y-2 md:col-span-2">
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
                </p>
              )}
              {displaySearchResults.length > 0 && !selectedCustomer && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
                  {displaySearchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c)}
                      className="w-full px-4 py-2 text-left hover:bg-accent"
                    >
                      <div className="font-medium">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.phone && `${c.phone} • `}
                        {c.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
              <Label>Ngày check-out * {nights > 0 ? `(${nights} đêm)` : ""}</Label>
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
                    disabled={(d) =>
                      !checkInDate || d <= parseISO(checkInDate)
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="payment_method">Phương thức thanh toán</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
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

          <div className="flex-1 flex flex-col space-y-2">
            <Label>Chọn phòng trống *</Label>
            <p className="text-xs text-muted-foreground">
              Danh sách phòng trống theo khoảng ngày check-in / check-out đã chọn.
            </p>
            {!checkInISO || !checkOutISO || nights <= 0 ? (
              <p className="text-sm text-muted-foreground">
                Vui lòng chọn ngày check-in và check-out trước
              </p>
            ) : isLoadingRooms ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="size-5 animate-spin" />
                <span>Đang tải danh sách phòng trống...</span>
              </div>
            ) : availableRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không có phòng trống trong khoảng thời gian này
              </p>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 min-w-0 space-y-2 overflow-hidden">
                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-3 space-y-2 h-[320px]">
                    {availableRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleRoom(room.id)}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRoomIds.has(room.id)}
                            onCheckedChange={() => toggleRoom(room.id)}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{room.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {room.room_number && (
                              <span>Số phòng: <strong>{room.room_number}</strong> • </span>
                            )}
                            {room.floor_number !== null && room.floor_number !== undefined && (
                              <span>Tầng <strong>{room.floor_number}</strong> • </span>
                            )}
                            <strong>{roomTypeLabels[room.room_type]}</strong> • Tối đa{" "}
                            {room.max_guests} khách
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(room.price_per_night)}/đêm
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {nights} đêm ={" "}
                            {formatCurrency(room.price_per_night * nights)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {selectedRoomsWithAmounts.length > 0 && (
            <div className="rounded-lg border p-4 bg-muted/30 shrink-0">
              <div className="space-y-1 text-sm">
                {selectedRoomsWithAmounts.map(({ room, amount }) => (
                  <div
                    key={room.id}
                    className="flex justify-between"
                  >
                    <span>{room.name}</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

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
              Tối đa: {formatCurrency(totalAmount)}
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
            />
          </div>

          {error && (
            <p className="text-sm text-destructive shrink-0">{error}</p>
          )}

          <DialogFooter className="shrink-0">
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
          onCreate={async (input) => {
            const result = await createCustomerAction(input);
            if (result.ok) {
              handleCustomerSelect(result.data);
              setIsCreateCustomerDialogOpen(false);
            } else throw new Error(result.message);
          }}
        />
      )}
    </Dialog>
  );
}

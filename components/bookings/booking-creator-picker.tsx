"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { useProfiles } from "@/hooks/use-profiles";
import { USER_ROLE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const INITIAL_STAFF_LIMIT = 10;
const SEARCH_STAFF_LIMIT = 20;
const CLEAR_VALUE = "__none__";

type BookingCreatorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowClear?: boolean;
  /** Hiện sẵn tên người đang gắn (có thể nằm ngoài page đầu). */
  selectedLabel?: string | null;
};

export function BookingCreatorPicker({
  value,
  onChange,
  disabled = false,
  allowClear = false,
  selectedLabel = null,
}: BookingCreatorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const trimmedSearch = debouncedSearch.trim();
  const isSearching = trimmedSearch.length > 0;

  const { profiles, isLoading } = useProfiles({
    page: 1,
    limit: isSearching ? SEARCH_STAFF_LIMIT : INITIAL_STAFF_LIMIT,
    search: trimmedSearch,
    role: USER_ROLE.STAFF,
    status: "active",
    enabled: open,
  });

  const options = useMemo(() => {
    const list = profiles.filter((p) => p.status === "active");
    if (
      value &&
      value !== CLEAR_VALUE &&
      !list.some((p) => p.id === value) &&
      selectedLabel
    ) {
      return [
        {
          id: value,
          full_name: selectedLabel,
          email: "",
        },
        ...list,
      ];
    }
    return list;
  }, [profiles, selectedLabel, value]);

  const displayLabel = useMemo(() => {
    if (value === CLEAR_VALUE || value === "") {
      return allowClear ? "Chưa gắn người tạo" : "Chọn nhân viên";
    }
    const matched = options.find((p) => p.id === value);
    return matched?.full_name || selectedLabel || "Chọn nhân viên";
  }, [allowClear, options, selectedLabel, value]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-9 w-full justify-between font-normal sm:max-w-xs"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm nhân viên theo tên, email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Đang tải...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {isSearching
                    ? "Không tìm thấy nhân viên phù hợp"
                    : "Không có nhân viên nào"}
                </CommandEmpty>
                <CommandGroup>
                  {allowClear ? (
                    <CommandItem
                      value={CLEAR_VALUE}
                      onSelect={() => {
                        onChange(CLEAR_VALUE);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          value === CLEAR_VALUE || value === ""
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      Chưa gắn người tạo
                    </CommandItem>
                  ) : null}
                  {options.map((profile) => (
                    <CommandItem
                      key={profile.id}
                      value={profile.id}
                      onSelect={() => {
                        onChange(profile.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          value === profile.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{profile.full_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {!isSearching && options.length >= INITIAL_STAFF_LIMIT ? (
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Đang hiện {INITIAL_STAFF_LIMIT} nhân viên gần nhất. Gõ tên
                    để tìm thêm.
                  </p>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { CLEAR_VALUE as BOOKING_CREATOR_CLEAR_VALUE };

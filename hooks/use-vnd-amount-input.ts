"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { formatNumberWithSeparators } from "@/lib/functions";
import {
  formatVndAmountDisplay,
  normalizeVndDigits,
  parseVndDigits,
} from "@/lib/vnd-amount";

type UseVndAmountInputOptions = {
  initialDigits?: string;
};

export function useVndAmountInput({
  initialDigits = "",
}: UseVndAmountInputOptions = {}) {
  const [digits, setDigits] = useState(() => normalizeVndDigits(initialDigits));
  const [isFocused, setIsFocused] = useState(false);

  const amount = parseVndDigits(digits);
  const displayValue = formatVndAmountDisplay(
    digits,
    isFocused,
    formatNumberWithSeparators
  );

  const onFocus = useCallback(() => setIsFocused(true), []);

  const onBlur = useCallback(() => setIsFocused(false), []);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDigits(normalizeVndDigits(event.target.value));
  }, []);

  return {
    digits,
    setDigits,
    amount,
    displayValue,
    isFocused,
    inputProps: {
      inputMode: "numeric" as const,
      value: displayValue,
      onFocus,
      onBlur,
      onChange,
    },
  };
}

"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
} from "react";
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
  const isComposingRef = useRef(false);

  const amount = parseVndDigits(digits);
  const displayValue = formatVndAmountDisplay(
    digits,
    formatNumberWithSeparators
  );

  const applyInputValue = useCallback((value: string) => {
    setDigits(normalizeVndDigits(value));
  }, []);

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      applyInputValue(event.currentTarget.value);
    },
    [applyInputValue]
  );

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (isComposingRef.current) return;
      applyInputValue(event.target.value);
    },
    [applyInputValue]
  );

  return {
    digits,
    setDigits,
    amount,
    displayValue,
    inputProps: {
      type: "text" as const,
      inputMode: "numeric" as const,
      lang: "en",
      autoComplete: "off",
      spellCheck: false,
      value: displayValue,
      onChange,
      onCompositionStart,
      onCompositionEnd,
    },
  };
}

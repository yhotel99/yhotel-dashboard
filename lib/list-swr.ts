import type { SWRConfiguration } from "swr";

export function listSwrConfig<T>(
  currentKey: string,
  initialKey: string | null,
  fallbackData: T | undefined
): SWRConfiguration<T> {
  if (fallbackData && initialKey && currentKey === initialKey) {
    return { fallbackData, revalidateOnMount: false };
  }
  return {};
}

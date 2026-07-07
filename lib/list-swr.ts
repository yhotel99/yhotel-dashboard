import type { SWRConfiguration } from "swr";

export function listSwrConfig<T>(
  currentKey: string,
  initialKey: string | null,
  fallbackData: T | undefined,
  /** SSR list pages omit branch filter; skip stale fallback when client filters by branch. */
  branchId?: string | null
): SWRConfiguration<T> {
  if (branchId) {
    return {};
  }
  if (fallbackData && initialKey && currentKey === initialKey) {
    return { fallbackData, revalidateOnMount: false };
  }
  return {};
}

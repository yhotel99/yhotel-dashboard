"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * URL search params updated via history.pushState — avoids App Router RSC refetch
 * on pagination/filter changes while keeping SSR for hard navigation / F5.
 *
 * pushState runs in useEffect (after commit), never inside setState updaters.
 */
export function useShallowSearchParams() {
  const pathname = usePathname();
  const nextSearchParams = useSearchParams();
  const pendingHistoryUrlRef = useRef<string | null>(null);

  const serverQueryString = nextSearchParams.toString();
  const [shallowQueryString, setShallowQueryString] = useState<string | null>(
    null
  );

  // Hard nav uses Next searchParams; shallow pushes use local override until remount.
  const queryString = shallowQueryString ?? serverQueryString;

  useEffect(() => {
    const onPopState = () => {
      setShallowQueryString(window.location.search.replace(/^\?/, ""));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const url = pendingHistoryUrlRef.current;
    if (url === null) return;
    pendingHistoryUrlRef.current = null;
    window.history.pushState(null, "", url);
  }, [queryString]);

  const searchParams = useMemo(
    () => new URLSearchParams(queryString),
    [queryString]
  );

  const pushSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setShallowQueryString((prev) => {
        const params = new URLSearchParams(prev ?? serverQueryString);
        mutate(params);
        const next = params.toString();
        pendingHistoryUrlRef.current = next
          ? `${pathname}?${next}`
          : pathname;
        return next;
      });
    },
    [pathname, serverQueryString]
  );

  const replaceSearchParams = useCallback(
    (nextQueryString: string) => {
      pendingHistoryUrlRef.current = nextQueryString
        ? `${pathname}?${nextQueryString}`
        : pathname;
      setShallowQueryString(nextQueryString);
    },
    [pathname]
  );

  return { searchParams, pushSearchParams, replaceSearchParams };
}

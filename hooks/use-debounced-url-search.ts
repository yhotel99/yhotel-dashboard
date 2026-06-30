"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * Keeps draft input in sync with URL on back/forward.
 * `lastCommitted` distinguishes our pushState updates from external URL changes.
 */
function useUrlSearchInputSync(urlSearch: string) {
  const [localSearch, setLocalSearch] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  const [lastCommitted, setLastCommitted] = useState(urlSearch);

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    if (urlSearch !== lastCommitted) {
      setLocalSearch(urlSearch);
      setLastCommitted(urlSearch);
    }
  }

  return { localSearch, setLocalSearch };
}

/**
 * Local search synced with URL on back/forward; debounces before onCommit.
 */
export function useDebouncedUrlSearch(
  urlSearch: string,
  onCommit: (value: string) => void,
  delay = 300
) {
  const { localSearch, setLocalSearch } = useUrlSearchInputSync(urlSearch);
  const debouncedSearch = useDebounce(localSearch, delay);

  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      onCommit(debouncedSearch);
    }
  }, [debouncedSearch, urlSearch, onCommit]);

  return { localSearch, setLocalSearch };
}

/** Commits every keystroke; still syncs input on browser back/forward. */
export function useImmediateUrlSearch(
  urlSearch: string,
  onCommit: (value: string) => void
) {
  const { localSearch, setLocalSearch } = useUrlSearchInputSync(urlSearch);

  useEffect(() => {
    if (localSearch !== urlSearch) {
      onCommit(localSearch);
    }
  }, [localSearch, urlSearch, onCommit]);

  return { localSearch, setLocalSearch };
}

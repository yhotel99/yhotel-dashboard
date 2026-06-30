"use client";

import { useState } from "react";

/** Capture the first-render SWR key (matches SSR) without reading refs during render. */
export function useInitialSwrKey(buildKey: () => string): string {
  const [initialSwrKey] = useState(buildKey);
  return initialSwrKey;
}

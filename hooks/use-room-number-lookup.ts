"use client";

import useSWR from "swr";
import { listRoomNumberLookup } from "@/actions/rooms";

/**
 * Map id phòng → số phòng (bảng rooms, cùng nguồn /dashboard/rooms). Dùng chung SWR key để chỉ 1 request.
 */
export function useRoomNumberLookup() {
  return useSWR(
    "room-number-lookup",
    async () => {
      const r = await listRoomNumberLookup();
      if (!r.ok) throw new Error(r.message);
      return r.data;
    },
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );
}

import { createClient } from "@/lib/supabase/server";

type BookingsJoinWithRooms = {
  customers?: unknown;
  rooms?: {
    name?: string;
    items?: Array<{ id: string; name?: string }>;
  } | null;
} | null;

export type RowWithBookingIdAndJoin = {
  booking_id: string | null;
  bookings?: BookingsJoinWithRooms;
};

/**
 * Gắn `bookings.rooms.items` từ `booking_rooms` để client tra số phòng (lookup bảng rooms).
 */
export async function enrichRowsWithBookingRoomItems<
  T extends RowWithBookingIdAndJoin,
>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: T[]
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const bookingIds = [
    ...new Set(
      rows
        .map((r) => r.booking_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (bookingIds.length === 0) return rows;

  const { data: brRows, error } = await supabase
    .from("booking_rooms")
    .select("booking_id, room_id")
    .in("booking_id", bookingIds);

  if (error || !brRows?.length) return rows;

  const bookingIdToRoomIds = new Map<string, string[]>();
  for (const row of brRows) {
    const bid = row.booking_id as string;
    const rid = row.room_id as string;
    if (!bookingIdToRoomIds.has(bid)) bookingIdToRoomIds.set(bid, []);
    bookingIdToRoomIds.get(bid)!.push(rid);
  }

  return rows.map((row) => {
    if (!row.booking_id) return row;
    const roomIds = bookingIdToRoomIds.get(row.booking_id);
    if (!roomIds?.length) return row;
    const items = roomIds.map((id) => ({ id }));
    if (!row.bookings) {
      return {
        ...row,
        bookings: {
          customers: null,
          rooms: { name: "", items },
        },
      };
    }
    const prevRooms = row.bookings.rooms;
    return {
      ...row,
      bookings: {
        ...row.bookings,
        rooms: prevRooms
          ? { ...prevRooms, items }
          : { name: "", items },
      },
    };
  });
}

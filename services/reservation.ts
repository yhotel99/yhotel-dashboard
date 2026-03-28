import { createClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { RoomWithBooking, Room, RoomStatusViewData, BookingRecord, PaginationMeta } from "@/lib/types";
import { ROOM_STATUS, type RoomMapStatus } from "@/lib/constants";

/**
 * Fetch reservation data from room_status_view
 * @returns Array of rooms with booking information and status
 */
export async function fetchReservationData(): Promise<RoomWithBooking[]> {
  try {
    const supabase = createClient();

    // Lấy data từ room_status_view
    const { data, error } = await supabase
      .from("room_status_view")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Map data từ view sang RoomWithBooking
    const roomsWithBookings: RoomWithBooking[] = (data || []).map(
      (item: RoomStatusViewData) => {
        // Parse price_per_night từ string sang number
        const pricePerNight = parseFloat(item.price_per_night);

        // Tạo room object
        const room: Room = {
          id: item.id,
          name: item.name,
          description: item.description,
          room_type: item.room_type,
          price_per_night: pricePerNight,
          max_guests: item.max_guests,
          amenities: Array.isArray(item.amenities) ? item.amenities : [],
          status: item.status as Room["status"],
          room_number: item.room_number || null,
          floor_number: item.floor_number || null,
          deleted_at: item.deleted_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };

        // Tạo currentBooking nếu có booking_id
        const currentBooking =
          item.booking_id && item.check_in && item.check_out
            ? {
                id: item.booking_id,
                check_in: item.check_in,
                check_out: item.check_out,
                status: item.booking_status || "pending",
              }
            : null;

        // Sử dụng trực tiếp current_status từ view (đã được chuẩn hóa)
        const mapStatus = item.current_status as RoomMapStatus;

        // isClean dựa vào technical_status
        const isClean = item.technical_status === ROOM_STATUS.CLEAN;

        return {
          ...room,
          currentBooking,
          mapStatus,
          isClean,
        };
      }
    );

    return roomsWithBookings;
  } catch (err) {
    console.error("Error fetching reservation data:", err);
    throw err;
  }
}

/**
 * Get available rooms in the next 30 days with their availability periods
 * @returns Array of rooms with their available date ranges
 */
export async function getAvailableRoomsIn30Days(): Promise<Array<{
  room: Room;
  availablePeriods: Array<{
    from: string;
    to: string;
    days: number;
  }>;
}>> {
  try {
    const supabase = await createServerClient();

    // Calculate date range (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    // Get all rooms
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("status", "available")
      .is("deleted_at", null)
      .order("floor_number", { ascending: true, nullsFirst: false })
      .order("room_number", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (roomsError) {
      throw new Error(roomsError.message);
    }

    // Get all bookings in the next 30 days
    const { data: bookings, error: bookingsError } = await supabase
      .from("booking_rooms")
      .select(`
        room_id,
        check_in,
        check_out,
        bookings!inner (
          status
        )
      `)
      .gte("check_in", todayStr)
      .lte("check_in", thirtyDaysStr)
      .in("bookings.status", ["confirmed", "pending", "checked_in"])
      .order("room_id")
      .order("check_in");

    if (bookingsError) {
      throw new Error(bookingsError.message);
    }

    // Calculate available periods for each room
    const roomsWithAvailability = (rooms || []).map((room: Room) => {
      const roomBookings = (bookings || [])
        .filter(b => b.room_id === room.id)
        .sort((a, b) => a.check_in.localeCompare(b.check_in));

      const availablePeriods: Array<{
        from: string;
        to: string;
        days: number;
      }> = [];

      let currentDate = todayStr;

      // Check gaps between bookings
      for (const booking of roomBookings) {
        if (currentDate < booking.check_in) {
          const daysDiff = Math.ceil(
            (new Date(booking.check_in).getTime() - new Date(currentDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff > 0) {
            availablePeriods.push({
              from: currentDate,
              to: booking.check_in,
              days: daysDiff,
            });
          }
        }
        currentDate = booking.check_out > currentDate ? booking.check_out : currentDate;
      }

      // Check if there's availability after the last booking
      if (currentDate < thirtyDaysStr) {
        const daysDiff = Math.ceil(
          (new Date(thirtyDaysStr).getTime() - new Date(currentDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 0) {
          availablePeriods.push({
            from: currentDate,
            to: thirtyDaysStr,
            days: daysDiff,
          });
        }
      }

      return {
        room,
        availablePeriods,
      };
    });

    // Only return rooms that have some availability
    return roomsWithAvailability.filter(r => r.availablePeriods.length > 0);
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách phòng trống";
    console.error("Error fetching available rooms:", err);
    throw new Error(errorMessage);
  }
}

/**
 * Get upcoming check-ins in the next 30 days (plus 2 days before) with pagination
 * @param search - Search term (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 50)
 * @returns Object with bookings data and pagination metadata
 */
export async function getUpcomingCheckinsWithPagination({
  search,
  page = 1,
  limit = 50,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
}): Promise<{
  data: BookingRecord[];
  pagination: PaginationMeta;
}> {
  try {
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createServerClient();

    // Calculate date range (2 days before to 30 days after)
    const today = new Date();
    const twoDaysBefore = new Date();
    twoDaysBefore.setDate(today.getDate() - 2);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const startDateStr = twoDaysBefore.toISOString().split('T')[0];
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    // Build query
    let query = supabase
      .from("bookings")
      .select(`
        *,
        customers:customer_id (
          id,
          full_name,
          phone,
          email
        ),
        rooms:room_id (
          id,
          name,
          room_number,
          floor_number
        ),
        booking_rooms (
          room_id,
          rooms:room_id (
            id,
            name,
            room_number,
            floor_number
          )
        )
      `)
      .in("status", ["pending", "confirmed", "checked_in", "checked_out"])
      .gte("check_in", startDateStr)
      .lte("check_in", thirtyDaysStr)
      .is("deleted_at", null);

    // Add search filter if provided
    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`
        booking_code.ilike.${searchTerm},
        customers.full_name.ilike.${searchTerm},
        rooms.name.ilike.${searchTerm}
      `);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "confirmed", "checked_in", "checked_out"])
      .gte("check_in", startDateStr)
      .lte("check_in", thirtyDaysStr)
      .is("deleted_at", null);

    // Add search filter to count query if provided
    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;
      countQuery = countQuery.or(`
        booking_code.ilike.${searchTerm},
        customers.full_name.ilike.${searchTerm},
        rooms.name.ilike.${searchTerm}
      `);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // Get paginated data
    const offset = (page - 1) * limit;
    const { data: bookings, error } = await query
      .order("check_in", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data: (bookings || []) as BookingRecord[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách phòng sắp nhận";
    console.error("Error fetching upcoming check-ins:", err);
    throw new Error(errorMessage);
  }
}
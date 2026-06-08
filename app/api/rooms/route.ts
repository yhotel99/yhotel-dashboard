import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Room, PaginationMeta } from "@/lib/types";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";

/**
 * GET /api/rooms
 * Search rooms with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const requestedBranchId = searchParams.get("branchId");
    const { scope } = await getCurrentUserBranchScope();
    const filterBranchId = resolveBranchFilterId(scope, requestedBranchId);

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with room_images join - only fetch thumbnail (is_main = true)
    let query = supabase
      .from("rooms")
      .select(
        `
        *,
        room_images!inner (
          image_id,
          is_main,
          images (
            id,
            url
          )
        )
      `,
        { count: "exact" }
      )
      .is("deleted_at", null)
      .eq("room_images.is_main", true);

    if (filterBranchId) {
      query = query.eq("branch_id", filterBranchId);
    }

    if (search && search.trim() !== "") {
      const term = search.trim();
      const pattern = `%${term}%`;
      query = query.or(`name.ilike.${pattern},room_number.ilike.${pattern}`);
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Process rooms to extract thumbnails
    type RoomWithImagesData = Room & {
      room_images?: Array<{
        image_id: string;
        is_main: boolean;
        images: {
          id: string;
          url: string;
        } | null;
      }>;
    };

    const roomsData = (data || []).map((room: RoomWithImagesData) => {
      const roomImages = room.room_images || [];

      // Get thumbnail - query already filtered for is_main = true, so take first item
      const thumbnailRoomImage = roomImages[0];
      const thumbnail =
        thumbnailRoomImage && thumbnailRoomImage.images
          ? {
              id: thumbnailRoomImage.images.id,
              url: thumbnailRoomImage.images.url,
            }
          : undefined;

      // Remove room_images from room data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { room_images, ...roomWithoutImages } = room;

      return {
        ...roomWithoutImages,
        amenities: Array.isArray(room.amenities) ? room.amenities : [],
        thumbnail,
      } as Room;
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: {
      data: Room[];
      pagination: PaginationMeta;
    } = {
      data: roomsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách phòng";
    console.error("Error fetching rooms:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

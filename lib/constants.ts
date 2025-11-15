import type { Room } from "./types";

/**
 * Room type labels mapping
 */
export const roomTypeLabels: Record<Room["room_type"], string> = {
  standard: "Standard",
  deluxe: "Deluxe",
  superior: "Superior",
  family: "Family",
};


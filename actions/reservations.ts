"use server";

import { revalidatePath } from "next/cache";

/**
 * Revalidate reservations page
 * This can be called after mutations that affect room status or bookings
 */
export async function revalidateReservations() {
  revalidatePath("/dashboard/reservation");
}

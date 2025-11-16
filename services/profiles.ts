import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/**
 * Fetch user profile by user ID
 * @param userId - The user ID to fetch profile for
 * @returns Profile object or null if not found or error
 */
export async function fetchProfileById(
  userId: string
): Promise<Profile | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  } catch (err) {
    console.error("Error fetching profile:", err);
    return null;
  }
}

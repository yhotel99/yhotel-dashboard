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

/**
 * Search profiles with pagination and search
 * @param search - Search term (searches in full_name, email, phone)
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object with profiles array and total count
 */
export async function searchProfiles(
  search: string | null,
  page: number,
  limit: number
): Promise<{ profiles: Profile[]; total: number }> {
  try {
    const supabase = createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    // Add search filter if search term exists
    // Search in full_name, email, and phone using OR operator
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const profilesData = (data || []) as Profile[];
    const total = count || 0;

    return {
      profiles: profilesData,
      total,
    };
  } catch (err) {
    console.error("Error searching profiles:", err);
    throw err;
  }
}

/**
 * Update profile
 * @param id - Profile ID
 * @param input - Update data
 * @returns Updated profile record
 */
export async function updateProfile(
  id: string,
  input: Partial<
    Omit<Profile, "id" | "created_at" | "updated_at" | "deleted_at">
  >
): Promise<Profile> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Profile;
  } catch (err) {
    console.error("Error updating profile:", err);
    throw err;
  }
}

/**
 * Delete profile (soft delete)
 * @param id - Profile ID
 */
export async function deleteProfile(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("Error deleting profile:", err);
    throw err;
  }
}

/**
 * Get profile by ID (alias for fetchProfileById for consistency)
 * @param id - Profile ID
 * @returns Profile record or null
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  return fetchProfileById(id);
}

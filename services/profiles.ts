
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Search profiles with pagination
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @returns Array of profile records
 */
export async function searchProfiles({
  search,
  page,
  limit,
}: {
  search: string | null;
  page: number;
  limit: number;
}): Promise<Profile[]> {
  try {
    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase.from("profiles").select("*").is("deleted_at", null);

    // Add search filter if search term exists
    // Search in full_name, email, and phone using OR operator
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Profile[];
  } catch (err) {
    console.error("Error searching profiles:", err);
    throw err;
  }
}

/**
 * Count profiles matching search criteria
 * @param search - Search term
 * @returns Total count
 */
export async function countProfiles({
  search,
}: {
  search: string | null;
}): Promise<number> {
  try {
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    // Add search filter if search term exists
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  } catch (err) {
    console.error("Error counting profiles:", err);
    throw err;
  }
}

/**
 * Get profile by ID
 * @param id - Profile ID
 * @returns Profile record or null
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  } catch (err) {
    console.error("Error getting profile:", err);
    return null;
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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

import { createClient } from "@/lib/supabase/client";
import type { Profile, PaginationMeta } from "@/lib/types";

// Query keys
export const profileKeys = {
  all: ["profiles"] as const,
  lists: () => [...profileKeys.all, "list"] as const,
  list: (page: number, limit: number, search: string) =>
    [...profileKeys.lists(), page, limit, search] as const,
  details: () => [...profileKeys.all, "detail"] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
};

// Fetch profiles query function
export async function fetchProfilesQuery(
  page: number,
  limit: number,
  search: string
): Promise<{ profiles: Profile[]; pagination: PaginationMeta }> {
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
  const totalPages = Math.ceil(total / limit);

  return {
    profiles: profilesData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

// Create profile mutation function (via API route)
export async function createProfileMutation(input: {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  role: Profile["role"];
  status: Profile["status"];
}): Promise<Profile> {
  const response = await fetch("/api/users/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Không thể tạo người dùng");
  }

  // Wait a bit for trigger to create profile
  await new Promise((resolve) => setTimeout(resolve, 500));

  return data.user;
}

// Update profile mutation function
export async function updateProfileMutation({
  id,
  input,
}: {
  id: string;
  input: Partial<
    Omit<Profile, "id" | "created_at" | "updated_at" | "deleted_at">
  >;
}): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

// Update password mutation function (via API route)
export async function updatePasswordMutation({
  id,
  newPassword,
}: {
  id: string;
  newPassword: string;
}): Promise<void> {
  const response = await fetch("/api/users/update-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      newPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Không thể cập nhật mật khẩu");
  }
}

// Delete profile mutation function
export async function deleteProfileMutation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}


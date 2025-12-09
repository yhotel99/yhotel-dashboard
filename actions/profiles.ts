"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin/server";
import type { Profile } from "@/lib/types";
import { USER_ROLE } from "@/lib/constants";

/**
 * Create a new profile (creates user in auth and profile record)
 */
export async function createProfileAction(
  input: Omit<Profile, "id" | "created_at" | "updated_at" | "deleted_at"> & {
    password: string;
  }
): Promise<Profile> {
  try {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    // Get current user to check permissions
    const { data: currentUser } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.user?.id)
      .single();

    // Check permissions (only admin and manager can create users)
    if (
      ![USER_ROLE.ADMIN, USER_ROLE.MANAGER].includes(profileData?.role) ||
      !profileData
    ) {
      throw new Error("Không có quyền tạo người dùng");
    }

    // Validate role (only manager and staff when creating)
    if (input.role !== "manager" && input.role !== "staff") {
      throw new Error(
        "Vai trò không hợp lệ. Chỉ có thể tạo 'manager' và 'staff'."
      );
    }

    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        user_metadata: {
          full_name: input.full_name,
          phone: input.phone || null,
        },
        email_confirm: true, // email will be confirmed automatically
      });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Không thể tạo người dùng");
    }

    // Create profile record
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: input.email,
        full_name: input.full_name,
        phone: input.phone || null,
        role: input.role,
        status: input.status,
      })
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, try to delete the auth user
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(profileError.message);
    }

    // Revalidate profiles page
    revalidatePath("/dashboard/users");

    return profile as Profile;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo người dùng";
    throw new Error(errorMessage);
  }
}

/**
 * Get profile by ID
 */
export async function getProfileByIdAction(
  id: string
): Promise<Profile | null> {
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
 */
export async function updateProfileAction(
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

    // Revalidate profiles page
    revalidatePath("/dashboard/users");

    return data as Profile;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật người dùng";
    throw new Error(errorMessage);
  }
}

/**
 * Delete profile (soft delete)
 */
export async function deleteProfileAction(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate profiles page
    revalidatePath("/dashboard/users");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa người dùng";
    throw new Error(errorMessage);
  }
}

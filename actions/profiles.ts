"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin/server";
import type { Profile } from "@/lib/types";
import { USER_ROLE } from "@/lib/constants";

/**
 * Create a new user (creates user in auth, profile will be created automatically)
 */
export async function createProfileAction(
  input: Omit<Profile, "id" | "created_at" | "updated_at" | "deleted_at"> & {
    password: string;
  }
): Promise<void> {
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
    if (input.role !== USER_ROLE.MANAGER && input.role !== USER_ROLE.STAFF) {
      throw new Error(
        "Vai trò không hợp lệ. Chỉ có thể tạo 'manager' và 'staff'."
      );
    }

    // Create user in Supabase Auth using admin API (trigger inserts profiles with DB defaults)
    const { data: authResult, error: authError } =
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
      // Translate common auth errors
      if (authError.message.includes("User already registered")) {
        throw new Error("Email này đã được đăng ký. Vui lòng sử dụng email khác.");
      }
      if (authError.message.includes("Password should be at least")) {
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
      }
      if (authError.message.includes("duplicate key value") && authError.message.includes("email")) {
        throw new Error("Email này đã tồn tại trong hệ thống.");
      }
      throw new Error("Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.");
    }

    const newUserId = authResult.user?.id;
    if (!newUserId) {
      throw new Error("Không thể tạo tài khoản. Vui lòng thử lại.");
    }

    const { error: profileUpdateError } = await adminSupabase
      .from("profiles")
      .update({
        role: input.role,
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newUserId);

    if (profileUpdateError) {
      throw new Error(
        "Tài khoản đã tạo nhưng không thể gán vai trò/trạng thái. Vui lòng chỉnh sửa người dùng trong danh sách."
      );
    }

    // Revalidate profiles page
    revalidatePath("/dashboard/users");
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
      // Check for duplicate email
      if (error.code === "23505" && error.message.includes("email")) {
        throw new Error("Email này đã tồn tại trong hệ thống.");
      }
      // Check for foreign key violations
      if (error.code === "23503") {
        throw new Error("Không thể cập nhật thông tin vì có dữ liệu liên quan.");
      }
      throw new Error("Không thể cập nhật thông tin người dùng. Vui lòng thử lại.");
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
      // Check for foreign key violations
      if (error.code === "23503") {
        throw new Error("Không thể xóa người dùng này vì có dữ liệu liên quan trong hệ thống.");
      }
      throw new Error("Không thể xóa người dùng. Vui lòng thử lại.");
    }

    // Revalidate profiles page
    revalidatePath("/dashboard/users");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa người dùng";
    throw new Error(errorMessage);
  }
}

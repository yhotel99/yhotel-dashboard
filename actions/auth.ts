"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SIDEBAR_URLS, USER_ROLE, USER_STATUS } from "@/lib/constants";
import { getProfileById } from "@/services/profiles";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email và mật khẩu không được để trống" };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      return { error: "Sai email hoặc mật khẩu" };
    }

    const user = data.user;
    if (!user) {
      return { error: "Đăng nhập thất bại" };
    }

    const profile = await getProfileById(user.id);

    if (!profile) {
      await supabase.auth.signOut();
      return { error: "Không tìm thấy thông tin tài khoản" };
    }

    if (profile.status !== USER_STATUS.ACTIVE) {
      await supabase.auth.signOut();

      const msg =
        profile.status === USER_STATUS.INACTIVE
          ? "Tài khoản của bạn đã bị vô hiệu hóa"
          : profile.status === USER_STATUS.SUSPENDED
          ? "Tài khoản của bạn đã bị tạm khóa"
          : "Tài khoản của bạn không được phép đăng nhập";

      return { error: msg };
    }

    // Get first allowed page based on role permissions
    // This checks permissions once and returns the best redirect path
    // const redirectPath = await getFirstAllowedPage(profile.role);

    const redirectUrl = profile.role === USER_ROLE.ADMIN ? SIDEBAR_URLS.DASHBOARD : SIDEBAR_URLS.RESERVATION
    redirect(redirectUrl)
  } catch (error) {
    console.error("Unexpected login error:", error);
    // Don't redirect on error, return error message
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error; // Re-throw redirect errors
    }
    return { error: "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại." };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

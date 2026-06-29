"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_REDIRECT, SIDEBAR_URLS, USER_STATUS } from "@/lib/constants";
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
      if (error.message === "Failed to fetch" || error.message.includes("fetch")) {
        return {
          error:
            "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
        };
      }
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
    // const redirectPath = await getFirstAllowedPage(profile.role); if too many role ( current role: 3 )

  const redirectPath =
    ROLE_REDIRECT[profile.role] ?? SIDEBAR_URLS.RESERVATION;

    
    redirect(redirectPath);
  } catch (error) {
    // NEXT_REDIRECT is not an error, it's how Next.js handles redirects
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error; // Re-throw redirect to let Next.js handle it
    }
    
    console.error("Unexpected login error:", error);

    const isNetworkError =
      error instanceof TypeError &&
      (error.message === "Failed to fetch" ||
        error.message.includes("fetch") ||
        error.message.includes("network"));

    if (isNetworkError) {
      return {
        error:
          "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
      };
    }

    return { error: "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại." };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

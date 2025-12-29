"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByIdAction } from "@/actions/profiles";
import { USER_STATUS } from "@/lib/constants";
import { hasViewPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email và mật khẩu không được để trống" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Sai email hoặc mật khẩu" };
  }

  const user = data.user;
  if (!user) {
    return { error: "Đăng nhập thất bại" };
  }

  const profile = await getProfileByIdAction(user.id);

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

  const userRole = profile.role;
  const redirectPath =
    userRole && hasViewPermission(userRole, "dashboard")
      ? "/dashboard"
      : "/dashboard/reservation";

  return redirect(redirectPath);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/dashboard', 'layout');
  redirect('/login');
}

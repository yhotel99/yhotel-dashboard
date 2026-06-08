/**
 * Seed admin user (admin@y99.vn) – dùng Auth Admin API.
 * Profile được tạo tự động bởi trigger DB khi insert auth.users;
 * script không insert/upsert profile khi user mới, chỉ update role khi user đã tồn tại.
 *
 * Env đọc từ .env.local (hoặc .env). Xem docs/SEED_ADMIN_LOCAL.md.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Thiếu env. Thêm vào .env.local (xem docs/SEED_ADMIN_LOCAL.md):"
  );
  console.error("   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321");
  console.error(
    "   SUPABASE_SERVICE_ROLE_KEY=<service_role key từ: npx supabase status>"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = "admin@y99.vn";
const ADMIN_PASSWORD = "admin";
const ADMIN_FULL_NAME = "System Admin";

async function seed() {
  let userId: string;

  const { data: existing } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  const existingUser = existing?.users?.find((u) => u.email === ADMIN_EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    console.log("✅ User admin đã tồn tại, cập nhật profile (role/status):", userId);
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: ADMIN_FULL_NAME,
        email: ADMIN_EMAIL,
        role: "admin",
        status: "active",
        branch_id: null,
        updated_at: now,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("❌ Cập nhật profile thất bại:", updateError.message);
      process.exit(1);
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_FULL_NAME,
        role: "admin",
      },
    });

    if (error) {
      console.error("❌ Tạo user thất bại:", error.message);
      process.exit(1);
    }

    if (!data.user) {
      console.error("❌ Không có user trả về");
      process.exit(1);
    }

    userId = data.user.id;
    console.log(
      "✅ Đã tạo user auth. Profile do trigger DB tạo tự động:",
      userId
    );
  }

  console.log("✅ Admin sẵn sàng. Đăng nhập:", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
}

seed();

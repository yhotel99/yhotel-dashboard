import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLE } from "@/lib/constants";
import { getSettings, updateSettings } from "@/services/settings";
import { z } from "zod";

const SETTINGS_ID = "yhotel-settings-main";

const settingsInputSchema = z.object({
  site_title: z.string().nullable().optional(),
  site_description: z.string().nullable().optional(),
  hero_images: z.array(z.object({
    id: z.string(),
    url: z.string(),
  })).nullable().optional(),
  contact_email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  contact_phone: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  contact_address: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  working_hours: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  facebook_url: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  instagram_url: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  twitter_url: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  youtube_url: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  bank_account_number: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  bank_name: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  bank_bin: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
  bank_account_owner: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

export async function GET() {
  try {
    const settings = await getSettings();
    
    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Error getting settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = settingsInputSchema.parse(body);

    const supabase = await createClient();

    // Check permissions (only admin and manager can update settings)
    const { data: currentUser } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.user?.id)
      .single();

    if (
      ![USER_ROLE.ADMIN, USER_ROLE.MANAGER].includes(profileData?.role) ||
      !profileData
    ) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const settings = await updateSettings(validatedData);

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


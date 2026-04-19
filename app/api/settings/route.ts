import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSettings, updateSettings } from "@/services/settings";
import { checkPermission } from "@/services/permissions";
import { z } from "zod";

const pricingHolidayPeriodSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    surcharge_percent: z.coerce.number().min(0).max(100),
  })
  .refine((d) => d.start_date <= d.end_date, {
    message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
    path: ["end_date"],
  });

const settingsInputSchema = z.object({
  site_title: z.string().nullable().optional(),
  site_description: z.string().nullable().optional(),
  hero_images: z.array(z.object({
    id: z.string(),
    url: z.string(),
  })).nullable().optional(),
  pricing_weekday_rates: z
    .array(z.coerce.number().min(0).max(100))
    .length(7)
    .nullable()
    .optional(),
  pricing_holiday_periods: z
    .array(pricingHolidayPeriodSchema)
    .nullable()
    .optional(),
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
  social_media_links: z
    .record(z.string(), z.string().url())
    .nullable()
    .optional(),
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
    const supabase = await createClient();

    const { data: currentUser } = await supabase.auth.getUser();
    
    if (!currentUser.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.user.id)
      .single();

    if (!profileData?.role) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

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

    // Check permissions using permission system
    const { data: currentUser } = await supabase.auth.getUser();
    
    if (!currentUser.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.user.id)
      .single();

    if (!profileData?.role) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if user has update:settings permission
    const hasPermission = await checkPermission(
      profileData.role,
      "update",
      "settings",
      supabase
    );

    if (!hasPermission) {
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


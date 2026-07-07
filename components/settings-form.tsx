"use client";

import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateSettingsAction } from "@/actions/settings";
import type { BranchBankAccount, Settings } from "@/lib/types";
import {
  getSuggestedVnHolidayPeriods,
  getSupportedPresetYears,
} from "@/lib/vn-holiday-presets";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ImageListSelector } from "@/components/image-selector";
import type { ImageValue } from "@/lib/types";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { DEFAULT_WEEKDAY_RATES, normalizeHolidayPeriods } from "@/lib/pricing";
import type { WeekdayRates } from "@/lib/types";
import { Banknote, CalendarRange, CreditCard, Globe, Hotel, Settings as SettingsIcon } from "lucide-react";
import { BranchBankAccountsTab } from "@/components/branch-bank-accounts-tab";
import { SettingsRoomCategoriesSection } from "@/components/settings-room-categories-section";
import { sortRoomCategories } from "@/lib/room-categories";

function ymdToday(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function newHolidayId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `holiday_${Date.now()}`;
}

function formatYmdToDmy(ymd?: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [yyyy, mm, dd] = ymd.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function parseDmyToYmd(dmy?: string | null): string | null {
  if (!dmy) return null;
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) return null;
  const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(
    2,
    "0"
  )}-${String(dd).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const check =
    date.getFullYear() === yyyy &&
    date.getMonth() + 1 === mm &&
    date.getDate() === dd;
  return check ? iso : null;
}

function DateDmyInput({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(() => formatYmdToDmy(value));
  const prevValueRef = useRef(value);

  if (value !== prevValueRef.current) {
    prevValueRef.current = value;
    setDraft(formatYmdToDmy(value));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/yyyy"
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const normalized = parseDmyToYmd(raw);
        if (normalized) onChange(normalized);
      }}
      onBlur={() => {
        const normalized = parseDmyToYmd(draft);
        if (normalized) {
          onChange(normalized);
          setDraft(formatYmdToDmy(normalized));
        } else {
          setDraft(formatYmdToDmy(value));
        }
      }}
    />
  );
}

const holidayPeriodRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Tên kỳ không được để trống"),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng YYYY-MM-DD"),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng YYYY-MM-DD"),
  surcharge_percent: z.coerce.number().min(0).max(100),
});

const roomCategoryRowSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/, "Mã phải là CHỮ_IN_HOA và số, VD: URBAN_COMPACT_TWIN"),
  name: z.string().min(1, "Tên hiển thị không được để trống"),
  description: z.string().nullable().optional(),
  sort_order: z.coerce.number(),
  is_active: z.boolean(),
});

const settingsSchema = z.object({
  site_title: z.string().min(1, "Tiêu đề không được để trống"),
  site_description: z.string().min(1, "Mô tả không được để trống"),
  hero_images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
      })
    )
    .nullable()
    .optional(),
  contact_email: z
    .union([z.string().email("Email không hợp lệ"), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  contact_phone: z
    .union([
      z.string().regex(/^$|^[0-9]{10,11}$/, "Số điện thoại không hợp lệ"),
      z.literal(""),
      z.null(),
    ])
    .transform((val) => (val === "" ? null : val)),
  contact_address: z
    .union([z.string(), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  working_hours: z
    .union([z.string(), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  social_media_links: z
    .record(z.string(), z.string().url("URL không hợp lệ"))
    .nullable()
    .optional(),
  pricing_weekday_rates: z
    .tuple([
      z.number().min(0).max(100),
      z.number().min(0).max(100),
      z.number().min(0).max(100),
      z.number().min(0).max(100),
      z.number().min(0).max(100),
      z.number().min(0).max(100),
      z.number().min(0).max(100),
    ])
    .nullable()
    .optional(),
  pricing_holiday_periods: z.array(holidayPeriodRowSchema),
  room_categories: z.array(roomCategoryRowSchema),
}).superRefine((data, ctx) => {
  data.pricing_holiday_periods.forEach((row, i) => {
    if (row.start_date > row.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
        path: ["pricing_holiday_periods", i, "end_date"],
      });
    }
  });

  const codes = new Set<string>();
  data.room_categories.forEach((row, i) => {
    if (codes.has(row.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mã phân loại bị trùng",
        path: ["room_categories", i, "code"],
      });
    }
    codes.add(row.code);
  });
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const EMPTY_BRANCH_BANK_ACCOUNTS: BranchBankAccount[] = [];

interface SettingsFormProps {
  initialData: Settings | null;
  branchBankAccounts?: BranchBankAccount[];
  canEditBank?: boolean;
}

export function SettingsForm({
  initialData,
  branchBankAccounts = EMPTY_BRANCH_BANK_ACCOUNTS,
  canEditBank = false,
}: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "general" | "pricing" | "room-categories" | "social" | "bank"
  >("general");
  const presetYears = getSupportedPresetYears();
  const [presetYear, setPresetYear] = useState<number>(() => {
    if (presetYears.includes(2026)) return 2026;
    return presetYears[presetYears.length - 1] ?? new Date().getFullYear();
  });
  const [heroImages, setHeroImages] = useState<ImageValue[]>(
    initialData?.hero_images || []
  );
  // Track stable IDs for social media entries to maintain stable keys
  const [socialMediaEntryIds, setSocialMediaEntryIds] = useState<
    Map<string, string>
  >(new Map());

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsFormValues>,
    defaultValues: {
      site_title: initialData?.site_title || "Dashboard Yhotel",
      site_description: initialData?.site_description || "Dashboard for Yhotel",
      hero_images: initialData?.hero_images || [],
      pricing_weekday_rates:
        (initialData?.pricing_weekday_rates?.length === 7
          ? (initialData.pricing_weekday_rates as WeekdayRates)
          : DEFAULT_WEEKDAY_RATES) ?? DEFAULT_WEEKDAY_RATES,
      contact_email: initialData?.contact_email || null,
      contact_phone: initialData?.contact_phone || null,
      contact_address: initialData?.contact_address || null,
      working_hours: initialData?.working_hours || null,
      social_media_links: initialData?.social_media_links || {},
      pricing_holiday_periods: normalizeHolidayPeriods(
        initialData?.pricing_holiday_periods
      ),
      room_categories: sortRoomCategories(initialData?.room_categories ?? []),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pricing_holiday_periods",
    keyName: "_rhfRowId",
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        site_title: initialData.site_title || "Dashboard Yhotel",
        site_description:
          initialData.site_description || "Dashboard for Yhotel",
        hero_images: initialData.hero_images || [],
        pricing_weekday_rates:
          (initialData.pricing_weekday_rates?.length === 7
            ? (initialData.pricing_weekday_rates as WeekdayRates)
            : DEFAULT_WEEKDAY_RATES) ?? DEFAULT_WEEKDAY_RATES,
        contact_email: initialData.contact_email || null,
        contact_phone: initialData.contact_phone || null,
        contact_address: initialData.contact_address || null,
        working_hours: initialData.working_hours || null,
        social_media_links: initialData.social_media_links || {},
        pricing_holiday_periods: normalizeHolidayPeriods(
          initialData.pricing_holiday_periods
        ),
        room_categories: sortRoomCategories(initialData.room_categories ?? []),
      });
      setHeroImages(initialData.hero_images || []);
    }
  }, [initialData, form]);

  // Update hero_images field when heroImages changes
  useEffect(() => {
    form.setValue("hero_images", heroImages);
  }, [heroImages, form]);

  // Update stable IDs when social media links change
  const socialMediaLinks = form.watch("social_media_links");
  useEffect(() => {
    const links = socialMediaLinks || {};
    const currentPlatforms = new Set(Object.keys(links));

    setSocialMediaEntryIds((prev) => {
      const newMap = new Map(prev);

      // Add IDs for new platforms
      currentPlatforms.forEach((platform) => {
        if (!newMap.has(platform)) {
          const newId = `social_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          newMap.set(platform, newId);
        }
      });

      // Remove IDs for deleted platforms
      Array.from(newMap.keys()).forEach((platform) => {
        if (!currentPlatforms.has(platform)) {
          newMap.delete(platform);
        }
      });

      return newMap;
    });
  }, [socialMediaLinks]);

  const handleSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true);
    try {
      // Clean social_media_links: remove entries with temp keys, empty platform names, or empty URLs
      let cleanedSocialLinks: Record<string, string> | null = null;
      if (data.social_media_links) {
        const validLinks: Record<string, string> = {};
        for (const [platform, url] of Object.entries(data.social_media_links)) {
          // Skip temp keys, empty platform names, or empty URLs
          if (
            !platform.startsWith("_temp_") &&
            platform.trim() !== "" &&
            url &&
            url.trim() !== ""
          ) {
            validLinks[platform.trim()] = url.trim();
          }
        }
        cleanedSocialLinks =
          Object.keys(validLinks).length > 0 ? validLinks : null;
      }

      // Convert empty strings to null
      const cleanedData = {
        ...data,
        hero_images: heroImages.length > 0 ? heroImages : null,
        pricing_weekday_rates: data.pricing_weekday_rates ?? DEFAULT_WEEKDAY_RATES,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        contact_address: data.contact_address || null,
        working_hours: data.working_hours || null,
        social_media_links: cleanedSocialLinks,
        pricing_holiday_periods: data.pricing_holiday_periods ?? [],
        room_categories: (data.room_categories ?? []).map((item, index) => ({
          ...item,
          sort_order: index + 1,
        })),
      };

      await updateSettingsAction(cleanedData);

      toast.success("Cập nhật cài đặt thành công!");
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể cập nhật cài đặt";
      toast.error("Cập nhật thất bại", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!initialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không tìm thấy cài đặt</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl font-bold tracking-tight">Cài đặt Website</CardTitle>
        <CardDescription className="text-muted-foreground text-base">
          Quản lý thông tin website, liên hệ và mạng xã hội
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="w-full"
            >
              <nav className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
                {(
                  [
                    { key: "general", label: "Chung", icon: SettingsIcon },
                    { key: "pricing", label: "Giá", icon: CreditCard },
                    {
                      key: "room-categories",
                      label: "Phân loại phòng",
                      icon: Hotel,
                    },
                    { key: "social", label: "Mạng xã hội", icon: Globe },
                    { key: "bank", label: "Tài khoản ngân hàng", icon: Banknote },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                        "hover:bg-muted/60 hover:border-primary",
                        isActive
                          ? "bg-muted border-primary shadow-sm"
                          : "bg-card border-border/60"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          "truncate",
                          isActive
                            ? "text-foreground"
                            : "text-foreground/90 group-hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <TabsContent value="general" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="site_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tiêu đề Website *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: Dashboard Yhotel"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Tiêu đề này sẽ hiển thị trong metadata của website
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="site_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả Website *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="VD: Dashboard for Yhotel"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Mô tả này sẽ hiển thị trong metadata của website
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <ImageListSelector
                      value={heroImages}
                      onChange={setHeroImages}
                      label="Chọn danh sách ảnh hero"
                    />
                    <FormDescription>
                      Chọn nhiều ảnh hero để hiển thị trên trang chủ của client
                    </FormDescription>
                  </div>


                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email liên hệ</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="VD: contact@yhotel.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số điện thoại</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="VD: 0901234567"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Địa chỉ</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="VD: 123 Đường ABC, Quận XYZ, TP.HCM"
                            {...field}
                            value={field.value || ""}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="working_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giờ làm việc</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="VD: Thứ 2 - Chủ nhật: 8:00 - 22:00"
                            {...field}
                            value={field.value || ""}
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Nhập thông tin giờ làm việc (có thể nhiều dòng)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Tăng giá theo thứ</div>
                        <p className="text-sm text-muted-foreground">
                          Áp dụng trên <strong>giá phòng gốc</strong> khi tính tổng tiền booking.
                          Mặc định: Thứ 6 +15%, Thứ 7 +20%, Chủ nhật–Thứ 5: +0%.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            form.setValue("pricing_weekday_rates", DEFAULT_WEEKDAY_RATES);
                          }}
                        >
                          Đặt lại mặc định
                        </Button>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="pricing_weekday_rates"
                      render={({ field }) => {
                        const value = Array.isArray(field.value) && field.value.length === 7
                          ? field.value
                          : DEFAULT_WEEKDAY_RATES;

                        const setAll = (percent: number) => {
                          const next = Array.from({ length: 7 }).map(() => percent);
                          field.onChange(next);
                        };

                        const setOne = (idx: number, percent: number) => {
                          const next = [...value];
                          next[idx] = percent;
                          field.onChange(next);
                        };

                        const days = [
                          "Chủ nhật",
                          "Thứ 2",
                          "Thứ 3",
                          "Thứ 4",
                          "Thứ 5",
                          "Thứ 6",
                          "Thứ 7",
                        ];

                        return (
                          <FormItem className="mt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                              {days.map((label, idx) => {
                                const isWeekend = idx === 5 || idx === 6;
                                return (
                                  <div
                                    key={label}
                                    className={[
                                      "flex flex-col items-center gap-2 rounded-xl border p-3",
                                      isWeekend ? "border-primary/20 bg-primary/5" : "border-muted",
                                    ].join(" ")}
                                  >
                                    <span
                                      className={[
                                        "text-[11px] font-semibold",
                                        isWeekend ? "text-primary" : "text-muted-foreground",
                                      ].join(" ")}
                                    >
                                      {label}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={1}
                                        className="w-20 text-center font-semibold"
                                        value={String(value[idx] ?? 0)}
                                        onChange={(e) =>
                                          setOne(idx, Number(e.target.value || 0))
                                        }
                                      />
                                      <span className="text-sm text-muted-foreground">%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/40 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-rose-700">
                                    Thiết lập nhanh Lễ / Tết
                                  </div>
                                  <p className="text-sm text-rose-700/80">
                                    Bấm 1 lần để set <strong>tất cả các ngày</strong> lên +20% / +25% / +30%.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setAll(20)}
                                  >
                                    +20%
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setAll(25)}
                                  >
                                    +25%
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setAll(30)}
                                  >
                                    +30%
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-3">
                        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CalendarRange className="size-4" />
                        </span>
                        <div>
                          <div className="font-semibold">Lịch lễ / Tết trong năm</div>
                          <p className="text-sm text-muted-foreground">
                            Mỗi đêm trong booking dùng{" "}
                            <strong>max(% theo thứ trong tuần, % phụ thu kỳ)</strong> nếu ngày
                            nằm trong khoảng (cận trên dưới gồm cả hai ngày).
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Gợi ý VN chỉ mang tính tham khảo — nên kiểm tra lại theo lịch nghỉ
                            chính thức từng năm.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={presetYear}
                          onChange={(e) => setPresetYear(Number(e.target.value))}
                        >
                          {presetYears.map((y) => (
                            <option key={y} value={y}>
                              Năm {y}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const rows = getSuggestedVnHolidayPeriods(presetYear);
                            if (!rows.length) {
                              toast.error(`Chưa có gợi ý cho năm ${presetYear}`);
                              return;
                            }
                            rows.forEach((row) => append(row));
                            toast.success(`Đã thêm ${rows.length} kỳ gợi ý năm ${presetYear}`);
                          }}
                        >
                          Thêm gợi ý VN
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const day = ymdToday();
                            append({
                              id: newHolidayId(),
                              label: "Kỳ lễ mới",
                              start_date: day,
                              end_date: day,
                              surcharge_percent: 25,
                            });
                          }}
                        >
                          <IconPlus className="mr-1 size-4" />
                          Thêm kỳ
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {fields.length === 0 ? (
                        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                          Chưa có kỳ lễ. Dùng &quot;Thêm gợi ý VN&quot; hoặc &quot;Thêm kỳ&quot; để bắt đầu.
                        </p>
                      ) : (
                        fields.map((row, index) => (
                          <div
                            key={(row as { _rhfRowId?: string })._rhfRowId ?? index}
                            className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 md:grid-cols-12 md:items-end"
                          >
                            <div className="md:col-span-4">
                              <FormField
                                control={form.control}
                                name={`pricing_holiday_periods.${index}.label`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Tên kỳ</FormLabel>
                                    <FormControl>
                                      <Input placeholder="VD: Tết Nguyên đán" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`pricing_holiday_periods.${index}.start_date`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Từ ngày</FormLabel>
                                    <FormControl>
                                      <DateDmyInput
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`pricing_holiday_periods.${index}.end_date`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Đến ngày</FormLabel>
                                    <FormControl>
                                      <DateDmyInput
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`pricing_holiday_periods.${index}.surcharge_percent`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Phụ thu %</FormLabel>
                                    <FormControl>
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          step={1}
                                          className="font-semibold"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(Number(e.target.value || 0))
                                          }
                                          value={String(field.value ?? 0)}
                                        />
                                        <span className="text-sm text-muted-foreground">%</span>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex justify-end md:col-span-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => remove(index)}
                                aria-label="Xóa kỳ"
                              >
                                <IconTrash className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="room-categories" className="space-y-4 mt-6">
                <SettingsRoomCategoriesSection />
              </TabsContent>

              <TabsContent value="social" className="space-y-4 mt-6">
                <FormField
                  control={form.control}
                  name="social_media_links"
                  render={({ field }) => {
                    const links = field.value || {};
                    const entries = Object.entries(links);

                    // Get stable IDs for each entry (IDs are managed in useEffect)
                    const getEntryId = (platform: string): string => {
                      return socialMediaEntryIds.get(platform) || platform;
                    };

                    // Create entries with stable IDs
                    const entriesWithStableKeys = entries.map(
                      ([platform, url]) => ({
                        id: getEntryId(platform),
                        platform,
                        url,
                        originalPlatform: platform, // Keep track of original for updates
                      })
                    );

                    const addLink = () => {
                      // Use empty string as key for new platform, user will fill in the name
                      const tempKey = `_temp_${Date.now()}`;
                      const newLinks = { ...links, [tempKey]: "" };
                      field.onChange(newLinks);
                    };

                    const updatePlatformName = (
                      originalPlatform: string,
                      newPlatformName: string
                    ) => {
                      const newLinks = { ...links };
                      const currentUrl = newLinks[originalPlatform] || "";

                      // Get the stable ID for the original platform
                      const entryId = socialMediaEntryIds.get(originalPlatform);

                      // Remove old entry
                      delete newLinks[originalPlatform];

                      // Determine new platform key
                      let newPlatformKey: string;
                      if (newPlatformName.trim() === "") {
                        // Keep as temp key if empty
                        newPlatformKey = originalPlatform.startsWith("_temp_")
                          ? originalPlatform
                          : `_temp_${Date.now()}`;
                      } else {
                        // Use new platform name as key
                        newPlatformKey = newPlatformName.trim();
                      }

                      // Add new entry
                      newLinks[newPlatformKey] = currentUrl;

                      // Update the ID mapping if platform key changed
                      if (entryId && newPlatformKey !== originalPlatform) {
                        setSocialMediaEntryIds((prev) => {
                          const newMap = new Map(prev);
                          newMap.delete(originalPlatform);
                          newMap.set(newPlatformKey, entryId);
                          return newMap;
                        });
                      }

                      field.onChange(
                        Object.keys(newLinks).length > 0 ? newLinks : {}
                      );
                    };

                    const updateLink = (platform: string, url: string) => {
                      const newLinks = { ...links };
                      if (url.trim() === "") {
                        delete newLinks[platform];
                      } else {
                        newLinks[platform] = url.trim();
                      }
                      field.onChange(
                        Object.keys(newLinks).length > 0 ? newLinks : {}
                      );
                    };

                    const removeLink = (platform: string) => {
                      const newLinks = { ...links };
                      delete newLinks[platform];
                      field.onChange(
                        Object.keys(newLinks).length > 0 ? newLinks : {}
                      );
                    };

                    return (
                      <FormItem>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <FormLabel>Mạng xã hội</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addLink}
                            >
                              <IconPlus className="mr-2 size-4" />
                              Thêm mạng xã hội
                            </Button>
                          </div>
                          <FormDescription>
                            Thêm các liên kết mạng xã hội của bạn. Bạn có thể
                            thêm bất kỳ mạng xã hội nào.
                          </FormDescription>
                          {entries.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                              Chưa có mạng xã hội nào. Nhấn &quot;Thêm mạng xã
                              hội&quot; để bắt đầu.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {entriesWithStableKeys.map(
                                ({ id, platform, url, originalPlatform }) => (
                                  <div
                                    key={id}
                                    className="flex items-start gap-2 p-3 border rounded-lg"
                                  >
                                    <div className="flex-1 space-y-2">
                                      <Input
                                        type="text"
                                        placeholder="Tên mạng xã hội (VD: Facebook, Instagram, TikTok...)"
                                        value={
                                          platform.startsWith("_temp_")
                                            ? ""
                                            : platform
                                        }
                                        onChange={(e) => {
                                          updatePlatformName(
                                            originalPlatform,
                                            e.target.value
                                          );
                                        }}
                                        className="font-medium"
                                      />
                                      <Input
                                        type="url"
                                        placeholder="URL (VD: https://facebook.com/yhotel)"
                                        value={url as string}
                                        onChange={(e) =>
                                          updateLink(
                                            originalPlatform,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        removeLink(originalPlatform)
                                      }
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <IconTrash className="size-4" />
                                    </Button>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </TabsContent>

              <TabsContent value="bank" className="space-y-4 mt-6">
                <BranchBankAccountsTab
                  accounts={branchBankAccounts}
                  canEditBank={canEditBank}
                />
              </TabsContent>
            </Tabs>

            <Separator />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

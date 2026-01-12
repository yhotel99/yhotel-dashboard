"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateSettingsAction } from "@/actions/settings";
import type { Settings } from "@/lib/types";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ImageListSelector } from "@/components/image-selector";
import type { ImageValue } from "@/lib/types";

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
  facebook_url: z
    .union([z.string().url("URL không hợp lệ"), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  instagram_url: z
    .union([z.string().url("URL không hợp lệ"), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  twitter_url: z
    .union([z.string().url("URL không hợp lệ"), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  youtube_url: z
    .union([z.string().url("URL không hợp lệ"), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  bank_account_number: z
    .union([z.string(), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  bank_name: z
    .union([z.string(), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  bank_bin: z
    .union([z.string(), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
  bank_account_owner: z
    .union([z.string(), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val)),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  initialData: Settings | null;
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heroImages, setHeroImages] = useState<ImageValue[]>(
    initialData?.hero_images || []
  );

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      site_title: initialData?.site_title || "Dashboard Yhotel",
      site_description: initialData?.site_description || "Dashboard for Yhotel",
      hero_images: initialData?.hero_images || [],
      contact_email: initialData?.contact_email || null,
      contact_phone: initialData?.contact_phone || null,
      contact_address: initialData?.contact_address || null,
      working_hours: initialData?.working_hours || null,
      facebook_url: initialData?.facebook_url || null,
      instagram_url: initialData?.instagram_url || null,
      twitter_url: initialData?.twitter_url || null,
      youtube_url: initialData?.youtube_url || null,
      bank_account_number: initialData?.bank_account_number || null,
      bank_name: initialData?.bank_name || null,
      bank_bin: initialData?.bank_bin || null,
      bank_account_owner: initialData?.bank_account_owner || null,
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        site_title: initialData.site_title || "Dashboard Yhotel",
        site_description:
          initialData.site_description || "Dashboard for Yhotel",
        hero_images: initialData.hero_images || [],
        contact_email: initialData.contact_email || null,
        contact_phone: initialData.contact_phone || null,
        contact_address: initialData.contact_address || null,
        working_hours: initialData.working_hours || null,
        facebook_url: initialData.facebook_url || null,
        instagram_url: initialData.instagram_url || null,
        twitter_url: initialData.twitter_url || null,
        youtube_url: initialData.youtube_url || null,
        bank_account_number: initialData.bank_account_number || null,
        bank_name: initialData.bank_name || null,
        bank_bin: initialData.bank_bin || null,
        bank_account_owner: initialData.bank_account_owner || null,
      });
      setHeroImages(initialData.hero_images || []);
    }
  }, [initialData, form]);

  // Update hero_images field when heroImages changes
  useEffect(() => {
    form.setValue("hero_images", heroImages);
  }, [heroImages, form]);

  const handleSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true);
    try {
      // Convert empty strings to null
      const cleanedData = {
        ...data,
        hero_images: heroImages.length > 0 ? heroImages : null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        contact_address: data.contact_address || null,
        working_hours: data.working_hours || null,
        facebook_url: data.facebook_url || null,
        instagram_url: data.instagram_url || null,
        twitter_url: data.twitter_url || null,
        youtube_url: data.youtube_url || null,
        bank_account_number: data.bank_account_number || null,
        bank_name: data.bank_name || null,
        bank_bin: data.bank_bin || null,
        bank_account_owner: data.bank_account_owner || null,
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
        <CardTitle>Cài đặt Website</CardTitle>
        <CardDescription>
          Quản lý thông tin website, liên hệ và mạng xã hội
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-full p-1">
                <TabsTrigger className="p-2" value="general">
                  Chung
                </TabsTrigger>
                <TabsTrigger className="p-2" value="contact">
                  Liên hệ
                </TabsTrigger>
                <TabsTrigger className="p-2" value="hours">
                  Giờ làm việc
                </TabsTrigger>
                <TabsTrigger className="p-2" value="social">
                  Mạng xã hội
                </TabsTrigger>
                <TabsTrigger className="p-2" value="bank">
                  Tài khoản ngân hàng
                </TabsTrigger>
              </TabsList>

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
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-6">
                <div className="space-y-4">
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
                </div>
              </TabsContent>

              <TabsContent value="hours" className="space-y-4 mt-6">
                <div className="space-y-4">
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

              <TabsContent value="social" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="facebook_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook URL</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="VD: https://facebook.com/yhotel"
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
                    name="instagram_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram URL</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="VD: https://instagram.com/yhotel"
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
                    name="twitter_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter URL</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="VD: https://twitter.com/yhotel"
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
                    name="youtube_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube URL</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="VD: https://youtube.com/@yhotel"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bank_account_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số tài khoản</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: 22102003"
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
                    name="bank_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên ngân hàng</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: ACB"
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
                    name="bank_bin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mã BIN ngân hàng</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: 970416"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Mã BIN của ngân hàng (VD: ACB = 970416)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_account_owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chủ tài khoản</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: TRAN QUANG KHAI"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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

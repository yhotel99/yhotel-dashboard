"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import {
  createRoom as createRoomAction,
  updateRoom as updateRoomAction,
} from "@/actions/rooms";
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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImageSelector, ImageListSelector } from "@/components/image-selector";
import { RoomDescriptionEditor } from "@/components/room-description-editor";
import { formatCurrency } from "@/lib/functions";
import {
  AMENITIES_OPTIONS,
  ROOM_STATUS,
  roomStatusLabels,
} from "@/lib/constants";
import { getRoomFormCategoryOptions } from "@/lib/room-categories";
import { useRoomCategories } from "@/hooks/use-room-categories";
import { MultiSelect } from "@/components/multi-select";
import { mutate } from "swr";
import { useBranch } from "@/contexts/branch-context";
import { useAuth } from "@/contexts/auth-context";
import { canViewAllBranches } from "@/lib/branch";
import { DEFAULT_BRANCH_ID } from "@/lib/constants";

// Room type enum matching database
export const roomTypeEnum = [
  "standard",
  "deluxe",
  "superior",
  "family",
] as const;
export const roomStatusEnum = [
  ROOM_STATUS.AVAILABLE,
  ROOM_STATUS.MAINTENANCE,
  ROOM_STATUS.NOT_CLEAN,
  ROOM_STATUS.CLEAN,
] as const;

// Base form validation schema
const baseRoomFormSchema = z.object({
  name: z.string().min(1, "Tên phòng là bắt buộc"),
  description: z.string().optional(),
  room_type: z.enum(roomTypeEnum),
  category_code: z.string().optional(),
  price_per_night: z
    .string()
    .min(1, "Giá mỗi đêm là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Giá phải là số và lớn hơn hoặc bằng 0",
    }),
  max_guests: z
    .string()
    .min(1, "Số khách tối đa là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
      message: "Số khách tối đa phải là số và lớn hơn hoặc bằng 1",
    }),
  status: z.enum(roomStatusEnum),
  amenities: z.array(z.string()),
  room_number: z.string().optional(),
  floor_number: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Number(val)),
      {
        message: "Số tầng phải là số",
      }
    ),
  images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
      })
    )
    .optional(),
  branch_id: z.string().optional(),
});

// Form validation schema for create (thumbnail required)
export const createRoomFormSchema = baseRoomFormSchema
  .extend({
    thumbnail: z
      .object({
        id: z.string(),
        url: z.string(),
      })
      .optional(),
  })
  .refine((data) => data.thumbnail !== undefined && data.thumbnail !== null, {
    message: "Ảnh chính (Thumbnail) là bắt buộc",
    path: ["thumbnail"],
  });

// Form validation schema for edit (thumbnail optional)
export const editRoomFormSchema = baseRoomFormSchema.extend({
  thumbnail: z
    .object({
      id: z.string(),
      url: z.string(),
    })
    .optional(),
});

// Default schema (for backward compatibility)
export const roomFormSchema = editRoomFormSchema;

export type RoomFormValues = z.infer<typeof roomFormSchema>;

interface RoomFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<RoomFormValues>;
  roomId?: string;
  onSubmit?: (data: RoomFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function RoomForm({
  mode = "create",
  defaultValues,
  roomId,
  onSubmit: externalOnSubmit,
  onCancel,
}: RoomFormProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { branches, filterBranchId } = useBranch();
  const showBranchPicker = Boolean(profile && branches.length > 0);
  const canSelectRoomBranch = Boolean(
    profile && canViewAllBranches(profile.role)
  );

  const defaultFormValues: RoomFormValues = {
    name: "",
    description: "",
    room_type: "standard",
    category_code: undefined,
    price_per_night: "0",
    max_guests: "2",
    status: ROOM_STATUS.AVAILABLE,
    amenities: [],
    room_number: "",
    floor_number: "",
    thumbnail: undefined,
    images: undefined,
    branch_id: filterBranchId ?? profile?.branch_id ?? DEFAULT_BRANCH_ID,
  };

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(
      mode === "create" ? createRoomFormSchema : editRoomFormSchema
    ),
    defaultValues: defaultValues
      ? {
        ...defaultFormValues,
        ...defaultValues,
        amenities: defaultValues.amenities ?? [],
      }
      : defaultFormValues,
  });

  const { categories, isLoading: categoriesLoading } = useRoomCategories();
  const watchedCategoryCode = form.watch("category_code");
  const categoryOptions = useMemo(
    () => getRoomFormCategoryOptions(categories, watchedCategoryCode),
    [categories, watchedCategoryCode]
  );

  const handleSubmit = async (data: RoomFormValues) => {
    try {
      if (externalOnSubmit) {
        await externalOnSubmit(data);
        return;
      }

      // Transform data to match database schema
      const roomData = {
        name: data.name,
        description: data.description || null,
        room_type: data.room_type,
        category_code: data.category_code || null,
        price_per_night: Number(data.price_per_night),
        max_guests: Number(data.max_guests),
        status: data.status,
        amenities: data.amenities,
        room_number: data.room_number || null,
        floor_number: data.floor_number ? Number(data.floor_number) : null,
        ...(data.branch_id ? { branch_id: data.branch_id } : {}),
      };

      if (mode === "edit") {
        // Update room with images
        await updateRoomAction(
          roomId!,
          roomData,
          data.thumbnail,
          data.images && data.images.length > 0 ? data.images : undefined
        );
        await mutate(["room", roomId]);
        toast.success("Cập nhật phòng thành công!", {
          description: `Phòng ${roomData.name} đã được cập nhật thành công.`,
        });
      } else {
        // Create room with images
        await createRoomAction(
          roomData,
          data.thumbnail,
          data.images && data.images.length > 0 ? data.images : undefined
        );
        toast.success("Tạo phòng thành công!", {
          description: `Phòng ${roomData.name} đã được tạo thành công.`,
        });
      }

      // Redirect to rooms page
      router.push("/dashboard/rooms");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : mode === "edit"
            ? "Không thể cập nhật phòng"
            : "Không thể tạo phòng";
      toast.error(
        mode === "edit" ? "Cập nhật phòng thất bại" : "Tạo phòng thất bại",
        {
          description: errorMessage,
        }
      );
      console.error("Room form error:", error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Chỉnh sửa thông tin phòng" : "Thông tin phòng"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Cập nhật thông tin phòng trong hệ thống"
            : "Điền đầy đủ thông tin để tạo phòng mới"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              {showBranchPicker ? (
                <FormField
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <FormItem>
                      {canSelectRoomBranch ? (
                        <>
                          <FormLabel>Chi nhánh *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={
                              field.value ?? filterBranchId ?? DEFAULT_BRANCH_ID
                            }
                          >
                            <FormControl className="w-full">
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn chi nhánh" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Chọn chi nhánh quản lý phòng này
                          </FormDescription>
                        </>
                      ) : (
                        <>
                          <FormLabel>Chi nhánh *</FormLabel>
                          <FormControl>
                            <Input
                              readOnly
                              value={
                                branches.find(
                                  (b) =>
                                    b.id ===
                                    (field.value ??
                                      profile?.branch_id ??
                                      DEFAULT_BRANCH_ID)
                                )?.name ?? "Chi nhánh mặc định"
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Phòng thuộc chi nhánh của tài khoản bạn
                          </FormDescription>
                        </>
                      )}
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên phòng *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Deluxe 301, Suite 201..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Tên phòng phải là duy nhất trong hệ thống
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại phòng *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại phòng" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="deluxe">Deluxe</SelectItem>
                        <SelectItem value="superior">Superior</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Loại phòng xác định mức giá và tiện ích
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phân loại phòng</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "__none__" ? undefined : value)
                      }
                      value={field.value ?? "__none__"}
                      disabled={categoriesLoading}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              categoriesLoading
                                ? "Đang tải phân loại..."
                                : "Chọn phân loại"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Không chọn</SelectItem>
                        {categoryOptions.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.name}
                            {!item.is_active ? " (Đã ngừng)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Phân loại chi tiết để quản lý phòng dễ dàng hơn
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số phòng</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: 101, 102, A01..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Số phòng để dễ dàng quản lý và tra cứu
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floor_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tầng</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 1, 2, 3..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Tầng mà phòng này nằm ở
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_night"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá mỗi đêm (VNĐ) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 500000"
                        {...field}
                        value={field.value ?? ""}
                        min={0}
                      />
                    </FormControl>
                    <FormDescription>
                      Giá phòng cho một đêm{" "}
                      <span className="text-base font-bold text-green-400">
                        {formatCurrency(Number(field.value))}
                      </span>
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số khách tối đa *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 2, 4, 6..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Số lượng người tối đa có thể ở
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ROOM_STATUS.AVAILABLE}>
                          {roomStatusLabels[ROOM_STATUS.AVAILABLE]}
                        </SelectItem>
                        <SelectItem value={ROOM_STATUS.MAINTENANCE}>
                          {roomStatusLabels[ROOM_STATUS.MAINTENANCE]}
                        </SelectItem>
                        <SelectItem value={ROOM_STATUS.NOT_CLEAN}>
                          {roomStatusLabels[ROOM_STATUS.NOT_CLEAN]}
                        </SelectItem>
                        <SelectItem value={ROOM_STATUS.CLEAN}>
                          {roomStatusLabels[ROOM_STATUS.CLEAN]}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Trạng thái kỹ thuật/quản trị của phòng
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiện ích</FormLabel>
                    <MultiSelect
                      options={AMENITIES_OPTIONS}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      placeholder="Chọn tiện ích phòng"
                      variant="default"
                      maxCount={5}
                      modalPopover={false}
                      className="w-full"
                    />
                    <FormDescription>
                      Chọn các tiện ích có trong phòng (tùy chọn)
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <RoomDescriptionEditor
                      content={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Mô tả chi tiết về phòng..."
                    />
                  </FormControl>
                  <FormDescription>
                    Mô tả chi tiết về phòng và các đặc điểm nổi bật
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    Ảnh chính (Thumbnail) {mode === "create" && "*"}
                  </FormLabel>
                  <FormControl>
                    <ImageSelector
                      value={field.value}
                      onChange={field.onChange}
                      description={
                        mode === "create"
                          ? "Chọn ảnh đại diện cho phòng (bắt buộc)"
                          : "Chọn ảnh đại diện cho phòng"
                      }
                    />
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageListSelector
                      value={field.value || []}
                      onChange={field.onChange}
                      label="Danh sách ảnh"
                      description="Chọn nhiều ảnh để hiển thị trong chi tiết phòng"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? mode === "edit"
                    ? "Đang cập nhật..."
                    : "Đang tạo..."
                  : mode === "edit"
                    ? "Cập nhật phòng"
                    : "Tạo phòng"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

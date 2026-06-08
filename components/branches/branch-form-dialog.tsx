"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ImageSelector } from "@/components/image-selector";
import type { Branch } from "@/lib/types";

const schema = z.object({
  code: z
    .string()
    .min(1, "Mã chi nhánh là bắt buộc")
    .regex(/^[a-z0-9_-]+$/, "Mã chỉ gồm chữ thường, số, gạch ngang"),
  name: z.string().min(1, "Tên là bắt buộc"),
  address: z.string().optional(),
  phone: z.string().optional(),
  image_url: z
    .object({
      id: z.string(),
      url: z.string(),
    })
    .nullable()
    .optional(),
  is_active: z.boolean(),
});

export type BranchFormValues = z.infer<typeof schema>;

interface BranchFormDialogProps {
  branch?: Branch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: BranchFormValues) => Promise<void>;
  onUpdate: (id: string, data: BranchFormValues) => Promise<void>;
}

export function BranchFormDialog({
  branch,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: BranchFormDialogProps) {
  const isEdit = !!branch;
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      address: "",
      phone: "",
      image_url: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (branch) {
      form.reset({
        code: branch.code,
        name: branch.name,
        address: branch.address || "",
        phone: branch.phone || "",
        image_url: branch.image_url
          ? { id: "", url: branch.image_url }
          : null,
        is_active: branch.is_active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        address: "",
        phone: "",
        image_url: null,
        is_active: true,
      });
    }
  }, [open, branch, form]);

  const onSubmit = async (data: BranchFormValues) => {
    if (isEdit && branch) {
      await onUpdate(branch.id, data);
    } else {
      await onCreate(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa chi nhánh" : "Thêm chi nhánh"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ảnh chi nhánh</FormLabel>
                  <FormControl>
                    <ImageSelector
                      value={field.value || undefined}
                      onChange={(value) => field.onChange(value ?? null)}
                      description="Ảnh hiển thị trên trang chọn chi nhánh của website"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã (public API)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} placeholder="main" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên chi nhánh</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Điện thoại</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Đang hoạt động</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{isEdit ? "Lưu" : "Tạo"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

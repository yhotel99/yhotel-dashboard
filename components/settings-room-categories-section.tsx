"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { normalizeCategoryCode } from "@/lib/room-categories";
import { useState } from "react";

export type RoomCategoryFormRow = {
  code: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
};

export function SettingsRoomCategoriesSection() {
  const form = useFormContext<{ room_categories: RoomCategoryFormRow[] }>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "room_categories",
    keyName: "_rhfRowId",
  });

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const code = normalizeCategoryCode(newCode);
    const name = newName.trim();
    if (!code || !name) return;

    const existing = form.getValues("room_categories") ?? [];
    if (existing.some((item) => item.code === code)) {
      form.setError("room_categories", {
        message: `Mã "${code}" đã tồn tại`,
      });
      return;
    }

    append({
      code,
      name,
      description: null,
      sort_order: existing.length + 1,
      is_active: true,
    });
    setNewCode("");
    setNewName("");
    form.clearErrors("room_categories");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Phân loại phòng</h3>
        <p className="text-sm text-muted-foreground">
          Quản lý danh sách phân loại hiển thị khi tạo/sửa phòng. Mã không thể
          đổi sau khi tạo.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <FormLabel>Mã phân loại</FormLabel>
          <Input
            placeholder="VD: URBAN_COMPACT_TWIN"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onBlur={() => setNewCode(normalizeCategoryCode(newCode))}
          />
        </div>
        <div className="space-y-2">
          <FormLabel>Tên hiển thị</FormLabel>
          <Input
            placeholder="VD: Urban Compact Twin Single"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={handleAdd}
          disabled={!normalizeCategoryCode(newCode) || !newName.trim()}
        >
          <IconPlus className="size-4" />
          Thêm
        </Button>
      </div>

      <FormField
        control={form.control}
        name="room_categories"
        render={() => (
          <FormItem>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Mã</TableHead>
                    <TableHead>Tên hiển thị</TableHead>
                    <TableHead className="w-[100px] text-center">
                      Hoạt động
                    </TableHead>
                    <TableHead className="w-[120px] text-right">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        Chưa có phân loại nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => (
                      <TableRow key={field._rhfRowId}>
                        <TableCell className="font-mono text-xs">
                          {field.code}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`room_categories.${index}.name`}
                            render={({ field: nameField }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input {...nameField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <FormField
                            control={form.control}
                            name={`room_categories.${index}.is_active`}
                            render={({ field: activeField }) => (
                              <FormItem className="flex justify-center space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={activeField.value}
                                    onCheckedChange={activeField.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={index === 0}
                              onClick={() => move(index, index - 1)}
                            >
                              <IconArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={index === fields.length - 1}
                              onClick={() => move(index, index + 1)}
                            >
                              <IconArrowDown className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              onClick={() => remove(index)}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <FormDescription>
              Tắt hoạt động hoặc xóa phân loại đang được phòng sử dụng sẽ bị
              chặn khi lưu.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

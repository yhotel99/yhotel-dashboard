"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { getRoomCountsByCategoryAction } from "@/actions/rooms";

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
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    void getRoomCountsByCategoryAction().then((result) => {
      if (result.ok) {
        setRoomCounts(result.data);
      }
    });
  }, [fields.length]);

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
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <h3 className="text-lg font-semibold">Hạng phòng hiển thị web</h3>
        <p className="mt-1 text-muted-foreground">
          Đây là danh sách <strong>hạng phòng</strong> dùng khi tạo phòng vật lý.
          Website sẽ gom tất cả phòng cùng hạng thành một thẻ đặt phòng.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Tạo hạng phòng tại đây (mã + tên hiển thị)</li>
          <li>Vào Quản lý phòng → Tạo phòng → chọn hạng tương ứng</li>
          <li>Mỗi phòng vật lý (101, 102...) gán cùng một hạng nếu cùng loại</li>
        </ol>
      </div>

      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <FormLabel>Mã hạng phòng</FormLabel>
          <Input
            placeholder="VD: URBAN_COMPACT_TWIN"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onBlur={() => setNewCode(normalizeCategoryCode(newCode))}
          />
          <p className="text-xs text-muted-foreground">
            Mã không đổi sau khi tạo. Dùng UPPER_SNAKE_CASE.
          </p>
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
          Thêm hạng
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
                    <TableHead className="w-[160px]">Mã</TableHead>
                    <TableHead>Tên & mô tả</TableHead>
                    <TableHead className="w-[90px] text-center">
                      Phòng
                    </TableHead>
                    <TableHead className="w-[90px] text-center">
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
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        Chưa có hạng phòng nào — hãy thêm hạng để gán cho phòng
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => (
                      <TableRow key={field._rhfRowId}>
                        <TableCell className="align-top font-mono text-xs">
                          {field.code}
                        </TableCell>
                        <TableCell className="align-top space-y-2">
                          <FormField
                            control={form.control}
                            name={`room_categories.${index}.name`}
                            render={({ field: nameField }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input {...nameField} placeholder="Tên hạng" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`room_categories.${index}.description`}
                            render={({ field: descField }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Textarea
                                    {...descField}
                                    value={descField.value ?? ""}
                                    placeholder="Ghi chú nội bộ (không hiện trực tiếp trên web)"
                                    rows={2}
                                    className="text-xs"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top text-center">
                          <Badge variant="secondary">
                            {roomCounts[field.code] ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top text-center">
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
                        <TableCell className="align-top text-right">
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
              Cột &quot;Phòng&quot; là số phòng vật lý đang gán hạng này. Tắt hoạt
              động hoặc xóa hạng đang được phòng sử dụng sẽ bị chặn khi lưu.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

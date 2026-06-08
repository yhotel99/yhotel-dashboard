"use client";

import * as React from "react";
import Image from "next/image";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Branch, BranchInput } from "@/lib/types";
import {
  createBranchAction,
  deleteBranchAction,
  updateBranchAction,
} from "@/actions/branches";
import {
  BranchFormDialog,
  type BranchFormValues,
} from "@/components/branches/branch-form-dialog";

export function BranchesContent({
  initialBranches,
}: {
  initialBranches: Branch[];
}) {
  const [branches, setBranches] = React.useState(initialBranches);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Branch | undefined>();

  const handleCreate = async (data: BranchFormValues) => {
    try {
      const input: BranchInput = {
        code: data.code,
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        image_url: data.image_url?.url || null,
        is_active: data.is_active,
      };
      const created = await createBranchAction(input);
      setBranches((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Đã tạo chi nhánh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể tạo chi nhánh");
      throw e;
    }
  };

  const handleUpdate = async (id: string, data: BranchFormValues) => {
    try {
      const updated = await updateBranchAction(id, {
        code: data.code,
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        image_url: data.image_url?.url || null,
        is_active: data.is_active,
      });
      setBranches((prev) =>
        prev.map((b) => (b.id === id ? updated : b)).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success("Đã cập nhật chi nhánh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể cập nhật");
      throw e;
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Vô hiệu hóa chi nhánh "${branch.name}"?`)) return;
    try {
      await deleteBranchAction(branch.id);
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
      toast.success("Đã vô hiệu hóa chi nhánh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể xóa");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Chi nhánh</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý các cơ sở khách sạn trong hệ thống
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <IconPlus className="mr-2 h-4 w-4" />
          Thêm chi nhánh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ảnh</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Chưa có chi nhánh
                </TableCell>
              </TableRow>
            ) : (
              branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.image_url ? (
                      <div className="relative h-12 w-20 overflow-hidden rounded-md border bg-muted">
                        <Image
                          src={b.image_url}
                          alt={b.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-20 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                        Chưa có
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{b.code}</TableCell>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.phone || "—"}</TableCell>
                  <TableCell>{b.is_active ? "Hoạt động" : "Tắt"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}/qr/${b.code}`;
                        void navigator.clipboard.writeText(url);
                        toast.success(`Đã copy link màn QR: /qr/${b.code}`);
                      }}
                    >
                      Link QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(b);
                        setOpen(true);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(b)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BranchFormDialog
        branch={editing}
        open={open}
        onOpenChange={setOpen}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </>
  );
}

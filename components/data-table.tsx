"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconRefresh,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ServerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  entityName?: string;
  getRowId?: (row: TData) => string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  fetchData?: () => void | Promise<void>;
  isLoading: boolean;
  serverPagination?: ServerPagination;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  serverSearch?: string;
  onSearchChange?: (search: string) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Tìm kiếm...",
  emptyMessage = "Không tìm thấy kết quả.",
  entityName = "bản ghi",
  getRowId,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 30, 50],
  fetchData,
  isLoading,
  serverPagination,
  onPageChange,
  onLimitChange,
  serverSearch,
  onSearchChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState({
    pageIndex: serverPagination ? serverPagination.page - 1 : 0,
    pageSize: serverPagination ? serverPagination.limit : defaultPageSize,
  });

  // Update pagination when serverPagination changes
  React.useEffect(() => {
    if (serverPagination) {
      setPagination({
        pageIndex: serverPagination.page - 1,
        pageSize: serverPagination.limit,
      });
    }
  }, [serverPagination]);

  // Note: React Compiler warning about useReactTable is expected and safe to ignore.
  // TanStack Table returns functions that cannot be memoized, which React Compiler
  // correctly identifies. The table instance is used directly and does not cause stale UI.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (serverPagination && typeof updater === "function") {
        const newPagination = updater(pagination);
        if (onPageChange && newPagination.pageIndex !== pagination.pageIndex) {
          onPageChange(newPagination.pageIndex + 1);
        }
        if (onLimitChange && newPagination.pageSize !== pagination.pageSize) {
          onLimitChange(newPagination.pageSize);
        }
      } else {
        setPagination(updater);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: serverPagination ? undefined : getFilteredRowModel(),
    getPaginationRowModel: serverPagination
      ? undefined
      : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
    manualPagination: !!serverPagination,
    pageCount: serverPagination ? serverPagination.totalPages : undefined,
  });

  // Calculate column width - use column size if defined, otherwise distribute equally
  const visibleHeaders = table
    .getHeaderGroups()[0]
    .headers.filter((h) => !h.isPlaceholder && h.column.getIsVisible());

  // Check if any column has a size defined
  const hasSizedColumns = visibleHeaders.some(
    (h) => h.column.columnDef.size !== undefined
  );

  // If columns have sizes, use them; otherwise distribute equally
  const getColumnWidth = (header: (typeof visibleHeaders)[0]) => {
    if (hasSizedColumns && header.column.columnDef.size) {
      return `${header.column.columnDef.size}px`;
    }
    return `${100 / visibleHeaders.length}%`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {searchKey && (
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Tìm kiếm
            </Label>
            <Input
              id="search"
              placeholder={searchPlaceholder}
              value={
                serverSearch !== undefined
                  ? serverSearch
                  : (table.getColumn(searchKey)?.getFilterValue() as string) ??
                    ""
              }
              onChange={(event) => {
                const value = event.target.value;
                if (serverSearch !== undefined && onSearchChange) {
                  // Server-side search: update URL which triggers refetch
                  onSearchChange(value);
                } else {
                  // Client-side search: update table filter
                  table.getColumn(searchKey)?.setFilterValue(value);
                }
              }}
              className="max-w-sm"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Cột hiển thị
                <IconChevronDown className="ml-2 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {fetchData && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              <IconRefresh
                className={`size-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table className="table-fixed w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder || !header.column.getIsVisible()) {
                    return null;
                  }

                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: getColumnWidth(header) }}
                      className="whitespace-nowrap"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton rows when loading
              Array.from({ length: pagination.pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {table
                    .getAllColumns()
                    .filter((column) => column.getIsVisible())
                    .map((column, colIndex) => {
                      const width =
                        hasSizedColumns && column.columnDef.size
                          ? `${column.columnDef.size}px`
                          : `${100 / visibleHeaders.length}%`;
                      return (
                        <TableCell
                          key={`skeleton-cell-${index}-${colIndex}`}
                          style={{ width }}
                        >
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      );
                    })}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    const width =
                      hasSizedColumns && cell.column.columnDef.size
                        ? `${cell.column.columnDef.size}px`
                        : `${100 / visibleHeaders.length}%`;
                    return (
                      <TableCell
                        key={cell.id}
                        style={{ width }}
                        className="whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {serverPagination ? (
            <>
              Hiển thị {data.length} trong tổng số {serverPagination.total}{" "}
              {entityName}.
            </>
          ) : (
            <>
              Hiển thị {table.getRowModel().rows.length} trong tổng số{" "}
              {table.getFilteredRowModel().rows.length} {entityName}.
            </>
          )}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Số dòng mỗi trang
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                const newSize = Number(value);
                if (serverPagination && onLimitChange) {
                  onLimitChange(newSize);
                } else {
                  table.setPageSize(newSize);
                }
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Trang {table.getState().pagination.pageIndex + 1} /{" "}
            {serverPagination
              ? serverPagination.totalPages
              : table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => {
                if (serverPagination && onPageChange) {
                  onPageChange(1);
                } else {
                  table.setPageIndex(0);
                }
              }}
              disabled={
                serverPagination
                  ? serverPagination.page <= 1
                  : !table.getCanPreviousPage()
              }
            >
              <span className="sr-only">Đi tới trang đầu</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => {
                if (serverPagination && onPageChange) {
                  onPageChange(serverPagination.page - 1);
                } else {
                  table.previousPage();
                }
              }}
              disabled={
                serverPagination
                  ? serverPagination.page <= 1
                  : !table.getCanPreviousPage()
              }
            >
              <span className="sr-only">Trang trước</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => {
                if (serverPagination && onPageChange) {
                  onPageChange(serverPagination.page + 1);
                } else {
                  table.nextPage();
                }
              }}
              disabled={
                serverPagination
                  ? serverPagination.page >= serverPagination.totalPages
                  : !table.getCanNextPage()
              }
            >
              <span className="sr-only">Trang sau</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => {
                if (serverPagination && onPageChange) {
                  onPageChange(serverPagination.totalPages);
                } else {
                  table.setPageIndex(table.getPageCount() - 1);
                }
              }}
              disabled={
                serverPagination
                  ? serverPagination.page >= serverPagination.totalPages
                  : !table.getCanNextPage()
              }
            >
              <span className="sr-only">Đi tới trang cuối</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

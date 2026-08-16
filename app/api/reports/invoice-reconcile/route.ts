import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLE } from "@/lib/constants";
import { resolveReportBranchId } from "@/lib/reports/branch-filter";
import { getBookingsListWithPagination } from "@/services/bookings";
import type { BookingRecord } from "@/lib/types";
import {
  parseInvoiceSheetRows,
  reconcileExcelWithDashboard,
  toDashBookingRow,
  bookingRoomNumbers,
  type DashBookingRow,
} from "@/lib/reports/invoice-reconcile";

export const runtime = "nodejs";

type DateField = "created_at" | "check_in" | "check_out" | "actual_check_out";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, status: 401, message: "Chưa đăng nhập" };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== USER_ROLE.ADMIN) {
    return {
      ok: false as const,
      status: 403,
      message: "Chỉ admin mới được đối soát Excel",
    };
  }
  return { ok: true as const, supabase, userId: user.id };
}

async function fetchAllBookings(params: {
  search: string | null;
  status: string | null;
  creatorId: string | null;
  dateField: DateField;
  dateFrom: string | null;
  dateTo: string | null;
  branchId: string | null;
}): Promise<BookingRecord[]> {
  const limit = 200;
  const all: BookingRecord[] = [];
  let page = 1;
  let cursorCreatedAt: string | null = null;
  let cursorId: string | null = null;

  for (;;) {
    const { data, pagination } = await getBookingsListWithPagination({
      search: params.search,
      page,
      limit,
      creatorId: params.creatorId,
      dateField: params.dateField,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      status: params.status,
      cursorCreatedAt,
      cursorId,
      branchId: params.branchId,
      includeTotal: page === 1,
    });
    all.push(...data);
    if (!data.length) break;
    const next = pagination.nextCursor;
    if (next?.created_at && next?.id) {
      cursorCreatedAt = next.created_at;
      cursorId = next.id;
      page += 1;
      continue;
    }
    if (pagination.totalPages && page < pagination.totalPages) {
      page += 1;
      cursorCreatedAt = null;
      cursorId = null;
      continue;
    }
    break;
  }
  return all;
}

async function enrichRoomNumbers(
  bookings: BookingRecord[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  for (const b of bookings) {
    map.set(b.id, bookingRoomNumbers(b));
  }
  const need = bookings.filter((b) => (map.get(b.id) ?? []).length === 0);
  if (!need.length) return map;

  const supabase = await createClient();
  const ids = need.map((b) => b.id);
  // Primary room_id
  const roomIds = [
    ...new Set(
      need.map((b) => b.room_id).filter((id): id is string => Boolean(id))
    ),
  ];
  const roomNumberById = new Map<string, string>();
  if (roomIds.length) {
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, room_number, name")
      .in("id", roomIds);
    for (const r of rooms ?? []) {
      const label = (r.room_number || r.name || "").trim();
      if (label) roomNumberById.set(r.id, label);
    }
  }
  for (const b of need) {
    if (b.room_id && roomNumberById.has(b.room_id)) {
      map.set(b.id, [roomNumberById.get(b.room_id)!]);
    }
  }

  // booking_rooms
  const { data: br } = await supabase
    .from("booking_rooms")
    .select("booking_id, rooms:room_id(room_number, name)")
    .in("booking_id", ids);
  for (const row of br ?? []) {
    const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
    const label = (
      (room as { room_number?: string; name?: string } | null)?.room_number ||
      (room as { room_number?: string; name?: string } | null)?.name ||
      ""
    )
      .toString()
      .trim()
      .toUpperCase();
    if (!label) continue;
    const prev = map.get(row.booking_id) ?? [];
    if (!prev.includes(label)) {
      map.set(row.booking_id, [...prev, label]);
    }
  }
  return map;
}

/**
 * POST /api/reports/invoice-reconcile
 * multipart: file (xlsx), dateField, dateFrom, dateTo, branchId?, status?, search?, creatorId?
 * File is parsed in-memory only — never persisted.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.message },
        { status: auth.status }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Thiếu file Excel (field: file)" },
        { status: 400 }
      );
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ file .xlsx / .xls" },
        { status: 400 }
      );
    }

    const dateFieldRaw = String(form.get("dateField") || "actual_check_out");
    const dateField: DateField =
      dateFieldRaw === "created_at" ||
      dateFieldRaw === "check_in" ||
      dateFieldRaw === "check_out" ||
      dateFieldRaw === "actual_check_out"
        ? dateFieldRaw
        : "actual_check_out";
    const dateFrom = String(form.get("dateFrom") || "").trim() || null;
    const dateTo = String(form.get("dateTo") || "").trim() || null;
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom và dateTo (YYYY-MM-DD) là bắt buộc" },
        { status: 400 }
      );
    }
    if (dateFrom > dateTo) {
      return NextResponse.json(
        { error: "dateFrom phải <= dateTo" },
        { status: 400 }
      );
    }

    const branchIdRaw = String(form.get("branchId") || "").trim() || null;
    const branchId = await resolveReportBranchId(branchIdRaw);
    const status = String(form.get("status") || "").trim() || null;
    const search = String(form.get("search") || "").trim() || null;
    const creatorId = String(form.get("creatorId") || "").trim() || null;

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { error: "File Excel không có sheet" },
        { status: 400 }
      );
    }
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
    }) as unknown[][];

    const { stays } = parseInvoiceSheetRows(matrix);

    const bookings = await fetchAllBookings({
      search,
      status,
      creatorId,
      dateField,
      dateFrom,
      dateTo,
      branchId,
    });

    const roomMap = await enrichRoomNumbers(bookings);
    const dashRows: DashBookingRow[] = bookings.map((b) => {
      const row = toDashBookingRow(b, dateField);
      const rooms = roomMap.get(b.id);
      if (rooms?.length) row.roomNumbers = rooms;
      return row;
    });

    const { rows, summary } = reconcileExcelWithDashboard(stays, dashRows);

    return NextResponse.json({
      summary,
      rows,
      meta: {
        fileName: file.name,
        sheetName,
        dateField,
        dateFrom,
        dateTo,
        branchId,
        status,
        search,
        creatorId,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không thể đối soát Excel";
    console.error("invoice-reconcile:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

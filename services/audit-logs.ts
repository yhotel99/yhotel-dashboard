import { createClient } from '@/lib/supabase/server';
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from '@/lib/branch.server';

export type AuditAction = 
  | 'booking.update'
  | 'booking.cancel'
  | 'booking.create'
  | 'booking.assign_creator'
  | 'refund.process'
  | 'refund.approve'
  | 'refund.reject'
  | 'refund.refunded'
  | 'price.update'
  | 'payment.update';

export interface AuditLogData {
  action: AuditAction;
  entityType: 'booking' | 'refund' | 'room' | 'payment';
  entityId: string;
  branchId?: string | null;
  userId?: string;
  userEmail?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

type AuditLogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown> | null;
};

type EnrichedAuditLog = AuditLogRow & {
  booking_id?: string | null;
  booking_code?: string | null;
  room_name?: string | null;
  room_number?: string | null;
};

async function resolveBookingIdsByCode(searchValue: string): Promise<string[]> {
  const normalizedValue = searchValue.trim();
  if (!normalizedValue || !/^YH/i.test(normalizedValue)) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .ilike('booking_code', normalizedValue)
    .limit(10);

  if (error) {
    console.error('Failed to resolve booking code for audit search:', error);
    return [];
  }

  return (data ?? [])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function getBookingIdFromLog(log: AuditLogRow): string | null {
  if (log.entity_type === 'booking') {
    return log.entity_id;
  }

  const metadata = log.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const bookingIdValue =
    metadata.bookingId ?? metadata.booking_id ?? null;

  return typeof bookingIdValue === 'string' && bookingIdValue.length > 0
    ? bookingIdValue
    : null;
}

async function enrichAuditLogs(logs: AuditLogRow[]): Promise<EnrichedAuditLog[]> {
  if (logs.length === 0) {
    return logs;
  }

  const supabase = await createClient();

  const bookingIds = Array.from(
    new Set(
      logs
        .map((log) => getBookingIdFromLog(log))
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  const roomIds = Array.from(
    new Set(
      logs
        .filter((log) => log.entity_type === 'room')
        .map((log) => log.entity_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  const refundIds = Array.from(
    new Set(
      logs
        .filter((log) => log.entity_type === 'refund')
        .map((log) => log.entity_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  const [bookingsResult, roomsResult, refundsResult] = await Promise.all([
    bookingIds.length > 0
      ? supabase.from('bookings').select('id, booking_code').in('id', bookingIds)
      : Promise.resolve({ data: [] as { id: string; booking_code: string | null }[], error: null }),
    roomIds.length > 0
      ? supabase.from('rooms').select('id, name, room_number').in('id', roomIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; room_number: string | null }[], error: null }),
    refundIds.length > 0
      ? supabase.from('refund_requests').select('id, booking_id, amount').in('id', refundIds)
      : Promise.resolve({ data: [] as { id: string; booking_id: string | null; amount: number | null }[], error: null }),
  ]);

  if (bookingsResult.error) {
    console.error('Failed to enrich audit logs with booking code:', bookingsResult.error);
  }
  if (roomsResult.error) {
    console.error('Failed to enrich audit logs with room info:', roomsResult.error);
  }
  if (refundsResult.error) {
    console.error('Failed to enrich audit logs with refund info:', refundsResult.error);
  }

  const bookingCodeById = new Map(
    (bookingsResult.data ?? []).map((booking) => [booking.id, booking.booking_code])
  );
  const roomById = new Map(
    (roomsResult.data ?? []).map((room) => [room.id, room])
  );
  const refundById = new Map(
    (refundsResult.data ?? []).map((refund) => [refund.id, refund])
  );

  // Resolve booking codes via refund_requests when metadata lacks bookingId
  const missingRefundBookingIds = Array.from(
    new Set(
      (refundsResult.data ?? [])
        .map((refund) => refund.booking_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && !bookingCodeById.has(id))
    )
  );

  if (missingRefundBookingIds.length > 0) {
    const { data: extraBookings, error: extraError } = await supabase
      .from('bookings')
      .select('id, booking_code')
      .in('id', missingRefundBookingIds);

    if (extraError) {
      console.error('Failed to enrich refund booking codes:', extraError);
    } else {
      for (const booking of extraBookings ?? []) {
        bookingCodeById.set(booking.id, booking.booking_code);
      }
    }
  }

  return logs.map((log) => {
    let bookingId = getBookingIdFromLog(log);
    if (!bookingId && log.entity_type === 'refund') {
      bookingId = refundById.get(log.entity_id)?.booking_id ?? null;
    }

    const bookingCode = bookingId ? bookingCodeById.get(bookingId) : null;
    const room = log.entity_type === 'room' ? roomById.get(log.entity_id) : null;

    return {
      ...log,
      booking_id: bookingId,
      booking_code: typeof bookingCode === 'string' ? bookingCode : null,
      room_name: room?.name ?? null,
      room_number: room?.room_number ?? null,
    };
  });
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const supabase = await createClient();
    
    const logEntry = {
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      branch_id: data.branchId ?? null,
      user_id: data.userId,
      user_email: data.userEmail,
      changes: data.changes,
      metadata: data.metadata,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      created_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('audit_logs')
      .insert(logEntry)
      .select()
      .single();

    if (error) {
      console.error('Failed to create audit log:', error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Audit log error:', error);
    return { success: false, error };
  }
}

export async function getAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  branchId?: string | null;
}) {
  try {
    const supabase = await createClient();
    const { scope } = await getCurrentUserBranchScope();
    const branchId = resolveBranchFilterId(scope, filters?.branchId);
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters?.entityId) {
      const normalizedEntityId = filters.entityId.trim();
      const relatedBookingIds = await resolveBookingIdsByCode(normalizedEntityId);
      const searchIds = Array.from(new Set([normalizedEntityId, ...relatedBookingIds]));

      const searchConditions = [
        ...searchIds.map((id) => `entity_id.eq.${id}`),
        ...searchIds.map((id) => `metadata->>bookingId.eq.${id}`),
        ...searchIds.map((id) => `metadata->>booking_id.eq.${id}`),
        `metadata->>bookingCode.eq.${normalizedEntityId}`,
        `metadata->>booking_code.eq.${normalizedEntityId}`,
      ];

      query = query.or(searchConditions.join(','));
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return { success: false, error };
    }

    const enrichedData = await enrichAuditLogs((data ?? []) as AuditLogRow[]);

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return { 
      success: true, 
      data: enrichedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      }
    };
  } catch (error) {
    console.error('Audit log fetch error:', error);
    return { success: false, error };
  }
}

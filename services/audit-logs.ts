import { createClient } from '@/lib/supabase/server';
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from '@/lib/branch.server';

export type AuditAction = 
  | 'booking.update'
  | 'booking.cancel'
  | 'booking.create'
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
      query = query.eq('entity_id', filters.entityId);
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

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return { 
      success: true, 
      data,
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

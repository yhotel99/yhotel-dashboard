import { createClient } from '@/lib/supabase/server';

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
  userId?: string;
  userEmail?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
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
  limit?: number;
}) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

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
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Audit log fetch error:', error);
    return { success: false, error };
  }
}

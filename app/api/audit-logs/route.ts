import { NextRequest } from 'next/server';
import { getAuditLogs, type AuditAction } from '@/services/audit-logs';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Get action with proper type handling
    const actionParam = searchParams.get('action');
    const action = actionParam as AuditAction | undefined;
    
    const filters = {
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      userId: searchParams.get('userId') || undefined,
      action: action || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    const result = await getAuditLogs(filters);

    if (!result.success) {
      // Check if table doesn't exist
      const error = result.error as { message?: string } | undefined;
      const errorMessage = error?.message || String(error || 'Unknown error');
      if (errorMessage.includes('relation "audit_logs" does not exist')) {
        return Response.json(
          { 
            success: false, 
            error: { 
              message: 'Bảng audit_logs chưa được tạo. Vui lòng chạy migrations.',
              code: 'TABLE_NOT_FOUND'
            } 
          },
          { status: 503 }
        );
      }
      
      return Response.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data: result.data || [],
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Audit logs API error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

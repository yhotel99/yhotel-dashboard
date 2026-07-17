'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale/vi';
import { Button } from '@/components/ui/button';
import { IconChevronLeft, IconChevronRight, IconBuilding } from '@tabler/icons-react';
import { useBranch } from '@/contexts/branch-context';
import { getBranchTableLabel } from '@/lib/branch';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  branch_id?: string | null;
  user_email: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  branchId?: string | null;
  limit?: number;
}

const actionLabels: Record<string, string> = {
  'booking.update': 'Cập nhật booking',
  'booking.cancel': 'Hủy booking',
  'booking.create': 'Tạo booking',
  'booking.assign_creator': 'Gắn / đổi người tạo',
  'refund.approve': 'Duyệt hoàn tiền',
  'refund.reject': 'Từ chối hoàn tiền',
  'refund.refunded': 'Đã hoàn tiền',
  'refund.process': 'Xử lý hoàn tiền',
  'price.update': 'Cập nhật giá',
  'payment.update': 'Cập nhật thanh toán',
};

const actionColors: Record<string, string> = {
  'booking.update': 'bg-blue-100 text-blue-800',
  'booking.cancel': 'bg-red-100 text-red-800',
  'booking.create': 'bg-green-100 text-green-800',
  'booking.assign_creator': 'bg-indigo-100 text-indigo-800',
  'refund.approve': 'bg-green-100 text-green-800',
  'refund.reject': 'bg-red-100 text-red-800',
  'refund.refunded': 'bg-emerald-100 text-emerald-800',
  'price.update': 'bg-yellow-100 text-yellow-800',
  'payment.update': 'bg-purple-100 text-purple-800',
};

export function AuditLogViewer({ entityType, entityId, branchId = null, limit = 20 }: AuditLogViewerProps) {
  const { branches } = useBranch();
  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches]
  );
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: limit,
    totalPages: 0,
  });

  const fetchLogs = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      if (branchId) params.append('branchId', branchId);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/audit-logs?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setLogs(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.error?.message || 'Không thể tải nhật ký');
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      setError('Lỗi khi tải nhật ký. Vui lòng kiểm tra xem bảng audit_logs đã được tạo chưa.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, branchId, limit]);

  useEffect(() => {
    void fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Đang tải...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-2">{error}</div>
        <div className="text-sm text-gray-500">
          Hãy chạy migrations: <code className="bg-gray-100 px-2 py-1 rounded">supabase db push</code>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return <div className="p-4 text-center text-gray-500">Chưa có lịch sử thay đổi</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {logs.map((log) => {
          const branchLabel = getBranchTableLabel(log.branch_id, branchNameById);
          return (
          <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  {log.branch_id ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                      <IconBuilding className="size-3" />
                      {branchLabel}
                    </span>
                  ) : null}
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(log.created_at), { 
                      addSuffix: true,
                      locale: vi 
                    })}
                  </span>
                </div>
                
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">{log.user_email}</span>
                  {' '}đã thực hiện thay đổi trên{' '}
                  <span className="font-medium">{log.entity_type}</span>
                  {' '}ID: <code className="bg-gray-100 px-1 rounded">{log.entity_id}</code>
                </div>

                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="text-xs text-gray-600 mt-2">
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                )}

                {log.changes && (
                  <button
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                  >
                    {expandedLog === log.id ? 'Ẩn chi tiết' : 'Xem chi tiết thay đổi'}
                  </button>
                )}

                {expandedLog === log.id && log.changes && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                    {log.changes.before && (
                      <div>
                        <div className="font-medium text-gray-700 mb-1">Trước:</div>
                        <pre className="bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(log.changes.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.changes.after && (
                      <div>
                        <div className="font-medium text-gray-700 mb-1">Sau:</div>
                        <pre className="bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(log.changes.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} bản ghi
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              <IconChevronLeft className="size-4" />
              Trước
            </Button>
            <div className="text-sm text-gray-600">
              Trang {pagination.page} / {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || loading}
            >
              Sau
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

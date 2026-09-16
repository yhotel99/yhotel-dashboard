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
  booking_id?: string | null;
  booking_code?: string | null;
  room_name?: string | null;
  room_number?: string | null;
  branch_id?: string | null;
  user_email: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  created_at: string;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatMoney(value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return currencyFormatter.format(value);
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

  const getEntityDisplay = (log: AuditLog) => {
    const bookingCode = log.booking_code?.trim();

    if (log.entity_type === 'room') {
      const roomNumber = log.room_number?.trim();
      const roomName = log.room_name?.trim();
      if (roomNumber && roomName && roomNumber !== roomName) {
        return `phòng ${roomNumber} (${roomName})`;
      }
      if (roomNumber || roomName) {
        return `phòng ${roomNumber || roomName}`;
      }
      return `phòng #${log.entity_id.slice(0, 8)}`;
    }

    if (log.entity_type === 'refund') {
      return bookingCode
        ? `hoàn tiền booking ${bookingCode}`
        : `yêu cầu hoàn tiền #${log.entity_id.slice(0, 8)}`;
    }

    if (log.entity_type === 'payment') {
      return bookingCode
        ? `thanh toán booking ${bookingCode}`
        : `thanh toán #${log.entity_id.slice(0, 8)}`;
    }

    if (log.entity_type === 'booking') {
      return bookingCode
        ? `booking ${bookingCode}`
        : `booking #${log.entity_id.slice(0, 8)}`;
    }

    return `${log.entity_type} #${log.entity_id.slice(0, 8)}`;
  };

  const getReadableSummary = (log: AuditLog): string[] => {
    const lines: string[] = [];
    const beforePrice = formatMoney(log.changes?.before?.price);
    const afterPrice = formatMoney(log.changes?.after?.price);

    if (log.action === 'price.update' && beforePrice && afterPrice) {
      lines.push(`Giá: ${beforePrice} → ${afterPrice}`);
      return lines;
    }

    if (log.entity_type === 'refund' && log.metadata) {
      const amount = formatMoney(log.metadata.amount);
      if (amount) lines.push(`Số tiền: ${amount}`);
      if (typeof log.metadata.status === 'string') {
        lines.push(`Trạng thái: ${log.metadata.status}`);
      }
      return lines;
    }

    return lines;
  };

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
                  <span className="font-medium">{getEntityDisplay(log)}</span>
                </div>

                {(() => {
                  const summary = getReadableSummary(log);
                  if (summary.length === 0) return null;
                  return (
                    <div className="text-xs text-gray-600 mt-2 space-y-0.5">
                      {summary.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  );
                })()}

                {(log.changes || (log.metadata && Object.keys(log.metadata).length > 0)) && (
                  <button
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                  >
                    {expandedLog === log.id ? 'Ẩn chi tiết' : 'Xem chi tiết thay đổi'}
                  </button>
                )}

                {expandedLog === log.id && (
                  <div className="mt-3 space-y-3 text-xs">
                    <div className="text-gray-500">
                      Mã kỹ thuật: <code className="bg-gray-100 px-1 rounded">{log.entity_id}</code>
                    </div>
                    {log.changes && (
                      <div className="grid grid-cols-2 gap-4">
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
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <div className="font-medium text-gray-700 mb-1">Metadata:</div>
                        <pre className="bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
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

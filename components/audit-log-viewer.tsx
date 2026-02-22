'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale/vi';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_email: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  created_at: string;
}

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

const actionLabels: Record<string, string> = {
  'booking.update': 'Cập nhật booking',
  'booking.cancel': 'Hủy booking',
  'booking.create': 'Tạo booking',
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
  'refund.approve': 'bg-green-100 text-green-800',
  'refund.reject': 'bg-red-100 text-red-800',
  'refund.refunded': 'bg-emerald-100 text-emerald-800',
  'price.update': 'bg-yellow-100 text-yellow-800',
  'payment.update': 'bg-purple-100 text-purple-800',
};

export function AuditLogViewer({ entityType, entityId, limit = 50 }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [entityType, entityId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/audit-logs?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data || []);
      } else {
        setError(data.error?.message || 'Không thể tải nhật ký');
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      setError('Lỗi khi tải nhật ký. Vui lòng kiểm tra xem bảng audit_logs đã được tạo chưa.');
    } finally {
      setLoading(false);
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
      {logs.map((log) => (
        <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                  {actionLabels[log.action] || log.action}
                </span>
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
      ))}
    </div>
  );
}

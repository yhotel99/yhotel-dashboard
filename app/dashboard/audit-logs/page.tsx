import { Suspense } from 'react';
import { AuditLogsContent } from '@/components/audit-logs/audit-logs-content';

export default function AuditLogsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhật Ký Hệ Thống</h1>
          <p className="text-muted-foreground">
            Theo dõi các hành động quan trọng: sửa booking, hoàn tiền, đổi giá
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
        <AuditLogsContent />
      </Suspense>
    </div>
  );
}

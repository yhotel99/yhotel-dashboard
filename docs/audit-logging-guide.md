# Hướng dẫn sử dụng Audit Logging

## Tổng quan

Hệ thống audit logging giúp theo dõi các hành động quan trọng trong ứng dụng:
- Sửa booking
- Hoàn tiền (approve/reject)
- Đổi giá phòng
- Cập nhật thanh toán

## Cài đặt Database

Chạy migration để tạo bảng `audit_logs`:

```bash
supabase db push
```

## Cách sử dụng

### 1. Log khi sửa booking

```typescript
import { logBookingUpdate } from '@/lib/audit-helpers';

// Trong API route hoặc server action
const beforeData = { status: 'pending', room_id: '123' };
const afterData = { status: 'confirmed', room_id: '456' };

await logBookingUpdate(
  bookingId,
  userId,
  userEmail,
  beforeData,
  afterData,
  { note: 'Khách yêu cầu đổi phòng' }
);
```

### 2. Log khi hoàn tiền

```typescript
import { logRefundProcess } from '@/lib/audit-helpers';

// Khi approve hoàn tiền
await logRefundProcess(
  refundId,
  bookingId,
  userId,
  userEmail,
  500000, // số tiền hoàn
  'approved',
  { reason: 'Khách hủy do lý do cá nhân' }
);

// Khi reject hoàn tiền
await logRefundProcess(
  refundId,
  bookingId,
  userId,
  userEmail,
  500000,
  'rejected',
  { reason: 'Quá hạn chính sách hoàn tiền' }
);
```

### 3. Log khi đổi giá

```typescript
import { logPriceUpdate } from '@/lib/audit-helpers';

await logPriceUpdate(
  roomId,
  userId,
  userEmail,
  1000000, // giá cũ
  1200000, // giá mới
  { reason: 'Điều chỉnh giá theo mùa cao điểm' }
);
```

### 4. Log khi cập nhật thanh toán

```typescript
import { logPaymentUpdate } from '@/lib/audit-helpers';

const beforeData = { status: 'pending', amount: 1000000 };
const afterData = { status: 'completed', amount: 1000000 };

await logPaymentUpdate(
  paymentId,
  userId,
  userEmail,
  beforeData,
  afterData,
  { payment_method: 'bank_transfer' }
);
```

## Xem audit logs

### Lấy tất cả logs của một booking

```typescript
import { getAuditLogs } from '@/services/audit-logs';

const { data } = await getAuditLogs({
  entityType: 'booking',
  entityId: bookingId,
  limit: 50
});
```

### Lấy logs theo user

```typescript
const { data } = await getAuditLogs({
  userId: userId,
  startDate: '2026-01-01',
  endDate: '2026-12-31'
});
```

### Lấy logs theo action

```typescript
const { data } = await getAuditLogs({
  action: 'refund.approve',
  limit: 100
});
```

## Ví dụ tích hợp vào API

```typescript
// app/api/bookings/[id]/route.ts
import { logBookingUpdate } from '@/lib/audit-helpers';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Lấy dữ liệu cũ
  const { data: oldBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single();

  // Cập nhật booking
  const updates = await request.json();
  const { data: newBooking, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  // Ghi log
  await logBookingUpdate(
    params.id,
    user.id,
    user.email!,
    oldBooking,
    newBooking,
    { updatedFields: Object.keys(updates) }
  );

  return Response.json({ data: newBooking });
}
```

## Cấu trúc dữ liệu Audit Log

```typescript
{
  id: 'uuid',
  action: 'booking.update' | 'refund.approve' | 'price.update' | ...,
  entity_type: 'booking' | 'refund' | 'room' | 'payment',
  entity_id: 'string',
  user_id: 'uuid',
  user_email: 'string',
  changes: {
    before: { ... },
    after: { ... }
  },
  metadata: { ... },
  ip_address: 'string',
  user_agent: 'string',
  created_at: 'timestamp'
}
```

## Best Practices

1. Luôn log trước khi thực hiện thay đổi quan trọng
2. Bao gồm đủ thông tin trong `metadata` để dễ debug
3. Lưu cả `before` và `after` data để có thể rollback nếu cần
4. Sử dụng các helper functions thay vì gọi trực tiếp `createAuditLog`
5. Xem xét thêm notification khi có hành động nhạy cảm (refund, price change lớn)

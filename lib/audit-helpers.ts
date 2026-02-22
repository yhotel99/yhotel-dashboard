import { createAuditLog, AuditLogData } from '@/services/audit-logs';
import { headers } from 'next/headers';

// Helper to get request metadata
async function getRequestMetadata() {
  const headersList = await headers();
  return {
    ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined,
    userAgent: headersList.get('user-agent') || undefined,
  };
}

// Log booking update
export async function logBookingUpdate(
  bookingId: string,
  userId: string,
  userEmail: string,
  beforeData: Record<string, any>,
  afterData: Record<string, any>,
  metadata?: Record<string, any>
) {
  const requestMeta = await getRequestMetadata();
  
  return createAuditLog({
    action: 'booking.update',
    entityType: 'booking',
    entityId: bookingId,
    userId,
    userEmail,
    changes: {
      before: beforeData,
      after: afterData,
    },
    metadata,
    ...requestMeta,
  });
}

// Log booking cancellation
export async function logBookingCancel(
  bookingId: string,
  userId: string,
  userEmail: string,
  reason?: string,
  metadata?: Record<string, any>
) {
  const requestMeta = await getRequestMetadata();
  
  return createAuditLog({
    action: 'booking.cancel',
    entityType: 'booking',
    entityId: bookingId,
    userId,
    userEmail,
    metadata: {
      ...metadata,
      reason,
    },
    ...requestMeta,
  });
}

// Log refund processing
export async function logRefundProcess(
  refundId: string,
  bookingId: string,
  userId: string,
  userEmail: string,
  amount: number,
  status: 'approved' | 'rejected' | 'refunded',
  metadata?: Record<string, any>
) {
  const requestMeta = await getRequestMetadata();
  
  // Map status to action
  let action: 'refund.approve' | 'refund.reject' | 'refund.refunded';
  if (status === 'approved') {
    action = 'refund.approve';
  } else if (status === 'rejected') {
    action = 'refund.reject';
  } else {
    action = 'refund.refunded';
  }
  
  return createAuditLog({
    action,
    entityType: 'refund',
    entityId: refundId,
    userId,
    userEmail,
    metadata: {
      ...metadata,
      bookingId,
      amount,
      status,
    },
    ...requestMeta,
  });
}

// Log price update
export async function logPriceUpdate(
  roomId: string,
  userId: string,
  userEmail: string,
  oldPrice: number,
  newPrice: number,
  metadata?: Record<string, any>
) {
  const requestMeta = await getRequestMetadata();
  
  return createAuditLog({
    action: 'price.update',
    entityType: 'room',
    entityId: roomId,
    userId,
    userEmail,
    changes: {
      before: { price: oldPrice },
      after: { price: newPrice },
    },
    metadata: {
      ...metadata,
      priceChange: newPrice - oldPrice,
      percentageChange: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2),
    },
    ...requestMeta,
  });
}

// Log payment update
export async function logPaymentUpdate(
  paymentId: string,
  userId: string,
  userEmail: string,
  beforeData: Record<string, any>,
  afterData: Record<string, any>,
  metadata?: Record<string, any>
) {
  const requestMeta = await getRequestMetadata();
  
  return createAuditLog({
    action: 'payment.update',
    entityType: 'payment',
    entityId: paymentId,
    userId,
    userEmail,
    changes: {
      before: beforeData,
      after: afterData,
    },
    metadata,
    ...requestMeta,
  });
}

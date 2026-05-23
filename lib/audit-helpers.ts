import { createAuditLog } from '@/services/audit-logs';
import { resolveAuditBranchId } from '@/lib/audit-branch';
import { headers } from 'next/headers';

// Helper to get request metadata
async function getRequestMetadata() {
  const headersList = await headers();
  return {
    ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined,
    userAgent: headersList.get('user-agent') || undefined,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

// Log booking update
export async function logBookingUpdate(
  bookingId: string,
  userId: string,
  userEmail: string,
  beforeData: unknown,
  afterData: unknown,
  metadata?: Record<string, unknown>
) {
  const requestMeta = await getRequestMetadata();
  const branchId = await resolveAuditBranchId({
    entityType: 'booking',
    entityId: bookingId,
    branchId:
      typeof metadata?.branchId === 'string' ? metadata.branchId : null,
  });

  return createAuditLog({
    action: 'booking.update',
    entityType: 'booking',
    entityId: bookingId,
    branchId,
    userId,
    userEmail,
    changes: {
      before: toRecord(beforeData),
      after: toRecord(afterData),
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
  metadata?: Record<string, unknown>
) {
  const requestMeta = await getRequestMetadata();
  const branchId = await resolveAuditBranchId({
    entityType: 'booking',
    entityId: bookingId,
    branchId:
      typeof metadata?.branchId === 'string' ? metadata.branchId : null,
  });

  return createAuditLog({
    action: 'booking.cancel',
    entityType: 'booking',
    entityId: bookingId,
    branchId,
    userId,
    userEmail,
    metadata: {
      ...metadata,
      reason,
    },
    ...requestMeta,
  });
}

// Log booking creation
export async function logBookingCreate(
  bookingId: string,
  userId: string,
  userEmail: string,
  metadata?: Record<string, unknown>
) {
  const requestMeta = await getRequestMetadata();
  const branchId = await resolveAuditBranchId({
    entityType: 'booking',
    entityId: bookingId,
    branchId:
      typeof metadata?.branchId === 'string' ? metadata.branchId : null,
  });

  return createAuditLog({
    action: 'booking.create',
    entityType: 'booking',
    entityId: bookingId,
    branchId,
    userId,
    userEmail,
    metadata,
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
  metadata?: Record<string, unknown>
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

  const branchId = await resolveAuditBranchId({
    entityType: 'refund',
    entityId: refundId,
    bookingId,
    branchId:
      typeof metadata?.branchId === 'string' ? metadata.branchId : null,
  });

  return createAuditLog({
    action,
    entityType: 'refund',
    entityId: refundId,
    branchId,
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
  metadata?: Record<string, unknown>
) {
  const requestMeta = await getRequestMetadata();
  const branchId = await resolveAuditBranchId({
    entityType: 'room',
    entityId: roomId,
    branchId:
      typeof metadata?.branchId === 'string' ? metadata.branchId : null,
  });

  return createAuditLog({
    action: 'price.update',
    entityType: 'room',
    entityId: roomId,
    branchId,
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
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>,
  metadata?: Record<string, unknown>
) {
  const requestMeta = await getRequestMetadata();
  const branchId = await resolveAuditBranchId({
    entityType: 'payment',
    entityId: paymentId,
    branchId:
      typeof metadata?.branchId === 'string' ? metadata.branchId : null,
  });

  return createAuditLog({
    action: 'payment.update',
    entityType: 'payment',
    entityId: paymentId,
    branchId,
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

-- Migration: Add essential performance indexes only
-- Optimized for Supabase free tier - only indexes for frequently used queries

-- ============================================================================
-- BOOKINGS TABLE INDEXES (Essential only)
-- ============================================================================

-- Index for customer_id (used in customer detail page - frequently accessed)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id 
ON bookings(customer_id) 
WHERE deleted_at IS NULL;

-- Index for created_at (used in all list views with ordering)
CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
ON bookings(created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- PAYMENT_LOGS TABLE INDEXES (Essential only)
-- ============================================================================

-- Index for transaction_id (frequently searched in payment logs)
CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id 
ON payment_logs(transaction_id) 
WHERE transaction_id IS NOT NULL;

-- Index for booking_code (frequently searched)
CREATE INDEX IF NOT EXISTS idx_payment_logs_booking_code 
ON payment_logs(booking_code) 
WHERE booking_code IS NOT NULL;

-- Index for created_at (used in all list views with ordering)
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at 
ON payment_logs(created_at DESC);

-- ============================================================================
-- PAYMENTS TABLE INDEXES (Essential only)
-- ============================================================================

-- Index for booking_id (foreign key - used in booking detail pages)
CREATE INDEX IF NOT EXISTS idx_payments_booking_id 
ON payments(booking_id);

-- Index for payment_status + paid_at (used in revenue reports - critical)
CREATE INDEX IF NOT EXISTS idx_payments_status_paid_at 
ON payments(payment_status, paid_at) 
WHERE paid_at IS NOT NULL;

-- ============================================================================
-- REFUND_REQUESTS TABLE INDEXES (Essential only)
-- ============================================================================

-- Index for created_at (used in all list views with ordering)
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at 
ON refund_requests(created_at DESC);

-- ============================================================================
-- CUSTOMERS TABLE INDEXES (Essential only)
-- ============================================================================

-- Index for phone (frequently searched - email already has unique index)
CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers(phone) 
WHERE phone IS NOT NULL;

-- Index for created_at (used in all list views with ordering)
CREATE INDEX IF NOT EXISTS idx_customers_created_at 
ON customers(created_at DESC);



create extension if not exists pg_trgm;

create index if not exists idx_bookings_booking_code_trgm
on bookings using gin (booking_code gin_trgm_ops);


-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This migration only includes indexes for:
-- 1. Foreign keys used in joins (booking_id, customer_id)
-- 2. Columns used in ORDER BY (created_at DESC - most common)
-- 3. Columns used in search (transaction_id, booking_code, phone)
-- 4. Critical composite indexes for reports (payment_status + paid_at)
-- 5. Role index for permission checks (used on every request)
--
-- Removed indexes that are:
-- - Rarely used in filters (status, room_type, payment_type)
-- - Covered by other indexes (composite indexes that duplicate single column indexes)
-- - Not critical for performance
--
-- Partial indexes (WHERE deleted_at IS NULL) reduce index size significantly
--
-- Monitor index usage: SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';


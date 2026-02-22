-- Test script for audit logs migrations
-- Run this to verify migrations work correctly

-- Step 1: Check if audit_logs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'audit_logs'
) as audit_logs_exists;

-- Step 2: Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Step 3: Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'audit_logs';

-- Step 4: Check RLS policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_logs';

-- Step 5: Check audit-logs permissions
SELECT name, description
FROM permissions
WHERE name LIKE '%audit-logs%';

-- Step 6: Check role permissions for audit-logs
SELECT rp.role, p.name as permission_name
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE p.name LIKE '%audit-logs%'
ORDER BY rp.role, p.name;

-- Step 7: Try to insert a test record (will fail if policies are wrong)
-- This should work for authenticated users
-- INSERT INTO audit_logs (action, entity_type, entity_id, user_email)
-- VALUES ('test.action', 'test', 'test-id', 'test@example.com');

-- Step 8: Count records
SELECT COUNT(*) as total_audit_logs FROM audit_logs;

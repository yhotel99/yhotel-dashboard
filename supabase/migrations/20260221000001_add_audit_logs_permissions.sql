-- Add audit-logs permissions
-- This migration adds permissions for the audit logs feature

-- Step 1: Insert permissions (safe with ON CONFLICT)
INSERT INTO permissions (name, description) VALUES
  ('view:audit-logs', 'View audit logs'),
  ('create:audit-logs', 'Create audit logs'),
  ('delete:audit-logs', 'Delete audit logs')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Grant audit-logs permissions to admin role
-- Using DO block for better error handling
DO $$
BEGIN
  -- Grant all audit-logs permissions to admin
  INSERT INTO role_permissions (role, permission_id)
  SELECT 'admin'::user_role, id FROM permissions WHERE name IN (
    'view:audit-logs',
    'create:audit-logs',
    'delete:audit-logs'
  )
  ON CONFLICT (role, permission_id) DO NOTHING;

  -- Grant view permission to manager
  INSERT INTO role_permissions (role, permission_id)
  SELECT 'manager'::user_role, id FROM permissions WHERE name = 'view:audit-logs'
  ON CONFLICT (role, permission_id) DO NOTHING;

  RAISE NOTICE 'Audit logs permissions added successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error adding audit logs permissions: %', SQLERRM;
END $$;

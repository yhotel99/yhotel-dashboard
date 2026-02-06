-- Add permissions for settings management
-- This migration adds view:settings and update:settings permissions

-- Step 1: Insert permissions for settings
INSERT INTO permissions (name, description)
VALUES 
  ('view:settings', 'View settings page and get settings data'),
  ('update:settings', 'Update website/hotel settings')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Assign view:settings permission to admin, manager, and staff
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin'::user_role, id 
FROM permissions 
WHERE name = 'view:settings'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'manager'::user_role, id 
FROM permissions 
WHERE name = 'view:settings'
ON CONFLICT (role, permission_id) DO NOTHING;


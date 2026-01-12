# Permissions Migration Guide

## Overview
Permissions system has been migrated from hardcoded values to database-driven approach. This allows for dynamic permission management without code changes.

## Database Schema

### Tables Created

1. **permissions** - Stores all available system permissions
   - `id`: UUID (Primary Key)
   - `name`: String (Unique, e.g., "view:dashboard", "view:users")
   - `description`: Text (Optional)
   - `created_at`: Timestamp

2. **role_permissions** - Maps roles to permissions
   - `id`: UUID (Primary Key)
   - `role`: user_role enum (admin, manager, staff)
   - `permission_id`: UUID (Foreign key to permissions.id)
   - `created_at`: Timestamp
   - Unique constraint on (role, permission_id)

## Migration Steps

### 1. Run Database Migrations

```bash
# Apply migrations to create tables
supabase migration up

# Or manually run the SQL files:
# - supabase/migrations/20250120000000_create_permissions.sql
# - supabase/migrations/20250120000001_seed_permissions.sql
```

### 2. Verify Data

Check that permissions and role_permissions are seeded correctly:

```sql
-- Check all permissions
SELECT * FROM permissions ORDER BY name;

-- Check role_permissions for admin
SELECT rp.role, p.name 
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role = 'admin'
ORDER BY p.name;

-- Check role_permissions for staff
SELECT rp.role, p.name 
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role = 'staff'
ORDER BY p.name;
```

## Architecture Changes

### Server-Side

- **services/permissions.ts**: New service layer for database operations
  - `getPermissionsByRole()`: Fetch permissions for a role
  - `getCurrentUserPermissions()`: Get permissions for current user
  - `checkPermission()`: Check if role has specific permission
  - `hasViewPermission()`: Check view permission for resource

- **lib/permissions.server.ts**: Updated to use async database calls
  - All functions are now async
  - Uses `services/permissions.ts` for database access

- **lib/server-actions.ts**: Updated to use async permission checks
- **actions/auth.ts**: Updated login redirect to use async permission check

### Client-Side

- **contexts/permissions-context.tsx**: New React Context for permission caching
  - Fetches permissions on mount
  - Caches permissions in state
  - Provides `hasPermission()` and `hasViewPermission()` helpers
  - Auto-refetches when user/profile changes

- **components/app-sidebar.tsx**: Updated to use `usePermissions()` hook
- **components/site-header.tsx**: Updated to use `usePermissions()` hook

### API Routes

- **app/api/permissions/route.ts**: Updated to fetch from database
  - Uses `getCurrentUserPermissions()` from services

## Usage Examples

### Server-Side (Server Actions/Components)

```typescript
import { hasViewPermission } from "@/lib/permissions";

// Async check
const canView = await hasViewPermission(role, "dashboard");
```

### Client-Side (React Components)

```typescript
import { usePermissions } from "@/contexts/permissions-context";

function MyComponent() {
  const { hasViewPermission, isLoading } = usePermissions();
  
  if (isLoading) return <div>Loading...</div>;
  
  if (hasViewPermission("dashboard")) {
    return <Dashboard />;
  }
  
  return <div>No access</div>;
}
```

## Adding New Permissions

### 1. Add Permission to Database

```sql
INSERT INTO permissions (name, description) 
VALUES ('view:new-feature', 'View new feature page');
```

### 2. Assign to Roles

```sql
-- For admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin'::user_role, id 
FROM permissions 
WHERE name = 'view:new-feature';

-- For manager
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager'::user_role, id 
FROM permissions 
WHERE name = 'view:new-feature';
```

### 3. Use in Code

```typescript
// Server-side
const canView = await hasViewPermission(role, "new-feature");

// Client-side
const { hasViewPermission } = usePermissions();
if (hasViewPermission("new-feature")) {
  // Show feature
}
```

## Performance Considerations

1. **Caching**: Client-side permissions are cached in React Context
2. **Database Indexes**: Indexes on `role_permissions.role` and `permissions.name` for fast lookups
3. **Async Operations**: All permission checks are async to support database queries

## Verification

### Manual Testing

1. **Login as Staff**:
   - Should only see: Reservations, Bookings, Customers
   - Other pages should be hidden/blocked

2. **Login as Admin/Manager**:
   - Should see all pages
   - Full access to all features

3. **Dynamic Update**:
   - Add new permission to role in database
   - Refresh page
   - Permission should take effect immediately

### Database Verification

```sql
-- Count permissions per role
SELECT 
  rp.role,
  COUNT(*) as permission_count
FROM role_permissions rp
GROUP BY rp.role;

-- Expected:
-- admin: 13 permissions
-- manager: 13 permissions  
-- staff: 3 permissions
```

## Rollback (if needed)

If you need to rollback to hardcoded permissions:

1. Revert code changes in:
   - `lib/permissions.server.ts`
   - `services/permissions.ts`
   - `lib/server-actions.ts`
   - `actions/auth.ts`
   - `components/app-sidebar.tsx`
   - `components/site-header.tsx`

2. Remove database tables (optional):
```sql
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
```

## Notes

- All permission checks are now async
- Client-side uses API endpoint `/api/permissions` for fetching
- Permissions are cached in React Context to minimize API calls
- Database queries use Supabase RLS policies for security


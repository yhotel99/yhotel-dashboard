import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all permissions for a specific role from database
 * Returns a Set for O(1) lookup performance
 */
export async function getPermissionsByRole(
  role: string,
  supabase?: SupabaseClient
): Promise<Set<string>> {
  const client = supabase || (await createClient());

  const { data, error } = await client
    .from("role_permissions")
    .select(`
      permission_id,
      permissions (
        name
      )
    `)
    .eq("role", role);

  if (error) {
    console.error("Error fetching permissions:", error);
    return new Set();
  }

  type RolePermissionRow = {
    permission_id: string;
    permissions: {
      name: string;
    } | {
      name: string;
    }[] | null;
  };

  const permissions = (data || [])
    .map((item: RolePermissionRow) => {
      // Handle both array and object formats from Supabase
      const permission = Array.isArray(item.permissions) 
        ? item.permissions[0] 
        : item.permissions;
      return permission?.name;
    })
    .filter((name: string | undefined): name is string => !!name);

  return new Set(permissions);
}

/**
 * Get all permissions for the current user
 */
export async function getCurrentUserPermissions(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    return [];
  }

  const permissionsSet = await getPermissionsByRole(profile.role, supabase);
  return Array.from(permissionsSet);
}

/**
 * Check if a role has a specific permission
 * Optimized: fetch permissions once and check in Set
 */
export async function checkPermission(
  role: string,
  action: string,
  resource: string,
  supabase?: SupabaseClient,
  permissionsCache?: Set<string>
): Promise<boolean> {
  const permissionName = `${action}:${resource}`;
  const permissions = permissionsCache || await getPermissionsByRole(role, supabase);
  return permissions.has(permissionName);
}

/**
 * Check if a role has view permission for a resource
 */
export async function hasViewPermission(
  role: string,
  resource: string,
  supabase?: SupabaseClient,
  permissionsCache?: Set<string>
): Promise<boolean> {
  return checkPermission(role, "view", resource, supabase, permissionsCache);
}

/**
 * Get all available permissions from database
 */
export async function getAllPermissions(): Promise<
  Array<{ id: string; name: string; description: string | null }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("id, name, description")
    .order("name");

  if (error) {
    console.error("Error fetching all permissions:", error);
    return [];
  }

  return data || [];
}


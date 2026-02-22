// Re-export async functions từ permissions.server.ts
// Permissions are now stored in database
export { checkPermission, hasViewPermission, getFirstAllowedPage } from "./permissions.server";

import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/contexts/auth-context";
import { PermissionsProvider } from "@/contexts/permissions-context";
import { ClientSync } from "@/components/client-sync";
import { AppSidebar } from "@/components/app-sidebar";
import { PermissionGuard } from "@/components/permission-guard";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getProfileByIdAction } from "@/actions/profiles";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    profile = await getProfileByIdAction(user.id);
  }

  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <PermissionsProvider>
        <ClientSync user={user} profile={profile} />
        <PermissionGuard user={user} profile={profile}>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                {children}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </PermissionGuard>
      </PermissionsProvider>
    </AuthProvider>
  );
}

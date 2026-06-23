import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/contexts/auth-context";
import { PermissionsProvider } from "@/contexts/permissions-context";
import { ClientSync } from "@/components/client-sync";
import { AppSidebar } from "@/components/app-sidebar";
import { PermissionGuard } from "@/components/permission-guard";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getProfileByIdAction } from "@/actions/profiles";
import { BranchProvider } from "@/contexts/branch-context";
import { listBranches } from "@/services/branches";

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
  let branches: Awaited<ReturnType<typeof listBranches>> = [];
  if (user) {
    profile = await getProfileByIdAction(user.id);
    try {
      branches = await listBranches();
    } catch {
      branches = [];
    }
  }

  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <PermissionsProvider>
        <BranchProvider initialBranches={branches}>
        <ClientSync user={user} profile={profile} />
        <PermissionGuard user={user} profile={profile}>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 56)",
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
        </BranchProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}

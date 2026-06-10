import { AppSidebar } from "@/components/app-sidebar"
import { RealtimeAlerts } from "@/components/realtime-alerts"
import { RoleProvider, type Role } from "@/components/role-context"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/server"

async function getCurrentMembership(): Promise<{
  role: Role | null
  asambleaId: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { role: null, asambleaId: null }

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined
  if (!asambleaId) return { role: null, asambleaId: null }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", user.id)
    .maybeSingle()
  return {
    role: (miembro?.role as Role | undefined) ?? null,
    asambleaId,
  }
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { role, asambleaId } = await getCurrentMembership()

  return (
    <TooltipProvider>
      <RoleProvider role={role}>
        <SidebarProvider>
          <AppSidebar role={role ?? undefined} />
          <SidebarInset>{children}</SidebarInset>
          {asambleaId && <RealtimeAlerts asambleaId={asambleaId} />}
        </SidebarProvider>
      </RoleProvider>
    </TooltipProvider>
  )
}

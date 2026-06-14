import { AppSidebar } from "@/components/app-sidebar"
import { AsambleaProvider, type AsambleaInfo } from "@/components/asamblea-context"
import { AvisosOverlay } from "@/components/avisos-overlay"
import { NotificacionesProvider } from "@/components/notificaciones-context"
import { RealtimeAlerts } from "@/components/realtime-alerts"
import { RoleProvider, type Role } from "@/components/role-context"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/server"

async function getCurrentMembership(): Promise<{
  role: Role | null
  asambleaId: string | null
  asamblea: AsambleaInfo | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { role: null, asambleaId: null, asamblea: null }

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .order("created_at", { ascending: false })
    .limit(1)
  const asamblea = asambleas?.[0] as
    | { id: string; numero: string | null; edicion: string | null }
    | undefined
  const asambleaId = asamblea?.id
  if (!asambleaId) return { role: null, asambleaId: null, asamblea: null }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", user.id)
    .maybeSingle()
  return {
    role: (miembro?.role as Role | undefined) ?? null,
    asambleaId,
    asamblea: { numero: asamblea.numero, edicion: asamblea.edicion },
  }
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { role, asambleaId, asamblea } = await getCurrentMembership()

  return (
    <TooltipProvider>
      <RoleProvider role={role}>
        <AsambleaProvider value={asamblea}>
          <NotificacionesProvider enabled={role !== "capitan"}>
            <SidebarProvider>
              <AppSidebar role={role ?? undefined} />
              <SidebarInset>{children}</SidebarInset>
              {asambleaId && <RealtimeAlerts asambleaId={asambleaId} />}
              {/* Los capitanes también ven los avisos cuando navegan el panel. */}
              {asambleaId && role === "capitan" && (
                <AvisosOverlay origen="capitan" asambleaId={asambleaId} />
              )}
            </SidebarProvider>
          </NotificacionesProvider>
        </AsambleaProvider>
      </RoleProvider>
    </TooltipProvider>
  )
}

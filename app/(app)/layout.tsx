import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/server"

async function getCurrentRole(): Promise<"owner" | "capitan" | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined
  if (!asambleaId) return null

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", user.id)
    .maybeSingle()
  return (miembro?.role as "owner" | "capitan" | undefined) ?? null
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const role = await getCurrentRole()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar role={role ?? undefined} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

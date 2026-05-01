"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOutIcon, UsersRoundIcon } from "lucide-react"

import { SearchForm } from "@/components/search-form"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"

const data = {
  navMain: [
    {
      title: "Asamblea",
      items: [
        { title: "Resumen", url: "/resumen" },
        { title: "Información", url: "#" },
        { title: "Programa", url: "#" },
        { title: "Sesiones", url: "#" },
      ],
    },
    {
      title: "Personal",
      items: [
        { title: "Capitanes", url: "/capitanes" },
        { title: "Acomodadores", url: "/acomodadores" },
        { title: "Hermanas de Apoyo", url: "/hermanas-de-apoyo" },
        { title: "Disponibilidad", url: "/disponibilidad" },
      ],
    },
    {
      title: "Asignaciones",
      items: [
        { title: "Puestos", url: "/puestos" },
        { title: "Turnos", url: "#" },
        { title: "Tablero", url: "#" },
      ],
    },
    {
      title: "Lugar",
      items: [
        { title: "Áreas", url: "/areas" },
        { title: "Mapa", url: "/mapa" },
      ],
    },
    {
      title: "Reportes",
      items: [
        { title: "Asistencia", url: "/asistencia" },
        { title: "Incidencias", url: "/incidencias" },
      ],
    },
    {
      title: "Configuración",
      items: [{ title: "Ajustes", url: "/ajustes" }],
    },
  ],
}

type Role = "owner" | "capitan" | null | undefined

export function AppSidebar({
  role = "owner",
  ...props
}: React.ComponentProps<typeof Sidebar> & { role?: Role }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = React.useState(false)
  const groups =
    role === "capitan"
      ? data.navMain
          .map((g) =>
            g.title === "Asignaciones"
              ? { ...g, items: g.items.filter((i) => i.title === "Puestos") }
              : g,
          )
          .filter(
            (g) =>
              g.title === "Personal" ||
              (g.title === "Asignaciones" && g.items.length > 0),
          )
      : data.navMain

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <UsersRoundIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">AMS-OS</span>
                <span className="text-xs text-muted-foreground">
                  Gestión de asambleas
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.url !== "#" && pathname === item.url}
                    >
                      <Link href={item.url}>{item.title}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOutIcon />
              <span>{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

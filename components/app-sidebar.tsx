"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOutIcon, UsersRoundIcon } from "lucide-react"

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
  useSidebar,
} from "@/components/ui/sidebar"
import { MensajesBadge } from "@/components/mensajes-badge"
import { RemplazosBadge } from "@/components/remplazos-badge"
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
        { title: "Pautas", url: "/pautas" },
      ],
    },
    {
      title: "Personal",
      items: [
        { title: "Sup. y Aux.", url: "/sub-aux" },
        { title: "Capitanes", url: "/capitanes" },
        { title: "Acomodadores", url: "/acomodadores" },
        { title: "Hermanas de Apoyo", url: "/hermanas-de-apoyo" },
        { title: "Personal", url: "/disponibilidad" },
      ],
    },
    {
      title: "Asignaciones",
      items: [
        { title: "Puestos", url: "/puestos" },
        { title: "Remplazos", url: "/remplazos" },
        { title: "Turnos", url: "#" },
        { title: "Tablero", url: "#" },
      ],
    },
    {
      title: "Lugar",
      items: [
        { title: "Áreas", url: "/areas" },
        { title: "Mapa", url: "/mapa" },
        { title: "Recepción del local", url: "/recepcion-local" },
      ],
    },
    {
      title: "Reportes",
      items: [
        { title: "Asistencia", url: "/asistencia" },
        { title: "Incidencias", url: "/incidencias" },
        { title: "Mensajes", url: "/mensajes" },
      ],
    },
    {
      title: "Configuración",
      items: [{ title: "Ajustes", url: "/ajustes" }],
    },
  ],
}

type Role = "owner" | "capitan" | "subcapitan" | "auxiliar" | null | undefined

export function AppSidebar({
  role = "owner",
  ...props
}: React.ComponentProps<typeof Sidebar> & { role?: Role }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const [signingOut, setSigningOut] = React.useState(false)
  // Cierra el sidebar después de cambiar de página (no en el montaje inicial).
  const prevPath = React.useRef(pathname)
  React.useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      if (isMobile) setOpenMobile(false)
      else setOpen(false)
    }
  }, [pathname, isMobile, setOpen, setOpenMobile])
  // Hide placeholder items that don't have a route yet.
  const visibleNav = data.navMain
    .map((g) => ({ ...g, items: g.items.filter((i) => i.url !== "#") }))
    .filter((g) => g.items.length > 0)

  // Superintendentes (subcapitan) and auxiliares see the full menu, like owner.
  // Only capitanes get the restricted navigation.
  const groups =
    role === "capitan"
      ? [
          // Atajos del capitán: su menú simple y su chat con administración.
          {
            title: "Capitán",
            items: [
              { title: "Menú simplificado", url: "/capitan" },
              { title: "Mensajes", url: "/capitan/mensajes" },
            ],
          },
          ...visibleNav
            .map((g) => {
              if (g.title === "Asignaciones") {
                return { ...g, items: g.items.filter((i) => i.title === "Puestos") }
              }
              if (g.title === "Lugar") {
                const allowed = ["Mapa", "Recepción del local"]
                return {
                  ...g,
                  items: g.items.filter((i) => allowed.includes(i.title)),
                }
              }
              if (g.title === "Reportes") {
                // El capitán reporta asistencia de sus áreas e incidencias;
                // los mensajes del admin no son suyos (usa /capitan/mensajes).
                const allowed = ["Asistencia", "Incidencias"]
                return {
                  ...g,
                  items: g.items.filter((i) => allowed.includes(i.title)),
                }
              }
              return g
            })
            .filter(
              (g) =>
                g.title === "Personal" ||
                ((g.title === "Asignaciones" ||
                  g.title === "Lugar" ||
                  g.title === "Reportes") &&
                  g.items.length > 0),
            ),
        ]
      : visibleNav

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
                      <Link href={item.url}>
                        <span>{item.title}</span>
                        {item.url === "/mensajes" && <MensajesBadge />}
                        {item.url === "/remplazos" && <RemplazosBadge />}
                      </Link>
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

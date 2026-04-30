"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UsersRoundIcon } from "lucide-react"

import { SearchForm } from "@/components/search-form"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

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
        { title: "Acomodadores", url: "/acomodadores" },
        { title: "Capitanes", url: "/capitanes" },
        { title: "Disponibilidad", url: "/disponibilidad" },
      ],
    },
    {
      title: "Asignaciones",
      items: [
        { title: "Puestos", url: "#" },
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

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
                <span className="font-medium">Acomodadores</span>
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
        {data.navMain.map((group) => (
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
      <SidebarRail />
    </Sidebar>
  )
}

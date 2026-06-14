"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { asambleaSubtitle, useAsamblea } from "@/components/asamblea-context"
import { useHayNotificaciones } from "@/components/notificaciones-context"
import { roleLabel, useRole } from "@/components/role-context"

export function PageHeader({
  title,
}: {
  /** @deprecated El breadcrumb se reemplazó por el subtítulo de la asamblea. */
  parent?: string
  title: string
}) {
  const role = useRole()
  const label = roleLabel(role)
  const subtitle = asambleaSubtitle(useAsamblea())
  const hayNotificaciones = useHayNotificaciones()
  return (
    <header className="flex shrink-0 items-start gap-3 border-b px-4 py-4 sm:px-6">
      <div className="relative -ml-1 mt-1 shrink-0">
        <SidebarTrigger />
        {hayNotificaciones && (
          <span className="pointer-events-none absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate font-serif text-2xl font-semibold leading-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {label && (
        <span className="ml-auto mt-1 inline-flex shrink-0 items-center rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </header>
  )
}

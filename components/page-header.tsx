"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { roleLabel, useRole } from "@/components/role-context"

export function PageHeader({
  parent,
  title,
}: {
  parent?: string
  title: string
}) {
  const role = useRole()
  const label = roleLabel(role)
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-auto"
      />
      <Breadcrumb>
        <BreadcrumbList>
          {parent && (
            <>
              <BreadcrumbItem className="hidden md:block">
                {parent}
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {label && (
        <span className="ml-auto inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </header>
  )
}

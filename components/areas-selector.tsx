"use client"

import * as React from "react"
import { ChevronDownIcon, XIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type AreaOption = {
  id: string
  piso: string
  nombre: string
}

export function areaLabel(a: { piso: string; nombre: string }): string {
  return `${a.piso} — ${a.nombre}`
}

export function AreasSelector({
  areas,
  value,
  onChange,
}: {
  areas: AreaOption[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  const selected = new Set(value)

  function toggle(label: string) {
    const next = new Set(selected)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    onChange(Array.from(next))
  }

  function remove(label: string) {
    const next = new Set(selected)
    next.delete(label)
    onChange(Array.from(next))
  }

  function clear() {
    onChange([])
  }

  if (areas.length === 0) return null

  const grouped = new Map<string, AreaOption[]>()
  for (const a of areas) {
    const list = grouped.get(a.piso) ?? []
    list.push(a)
    grouped.set(a.piso, list)
  }

  const triggerLabel =
    value.length === 0
      ? "Selecciona áreas…"
      : `${value.length} área${value.length === 1 ? "" : "s"} seleccionada${
          value.length === 1 ? "" : "s"
        }`

  return (
    <div className="grid gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm shadow-xs transition-colors",
            "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "data-[state=open]:ring-2 data-[state=open]:ring-ring",
            value.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="max-h-80 w-(--radix-dropdown-menu-trigger-width) min-w-56 overflow-y-auto"
        >
          {Array.from(grouped.entries()).map(([piso, items], i) => (
            <React.Fragment key={piso}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>{piso}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground/80">
                  {items.filter((a) => selected.has(areaLabel(a))).length}/
                  {items.length}
                </span>
              </DropdownMenuLabel>
              {items.map((a) => {
                const label = areaLabel(a)
                return (
                  <DropdownMenuCheckboxItem
                    key={a.id}
                    checked={selected.has(label)}
                    onCheckedChange={() => toggle(label)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {a.nombre}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pl-2.5 pr-1 text-xs"
            >
              <span className="max-w-[14rem] truncate">{label}</span>
              <button
                type="button"
                onClick={() => remove(label)}
                aria-label={`Quitar ${label}`}
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clear}
            className="ml-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  )
}

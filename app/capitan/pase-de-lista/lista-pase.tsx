"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  ChevronDownIcon,
  PhoneIcon,
  UserRoundXIcon,
} from "lucide-react"

import { WhatsappIcon } from "@/components/whatsapp-icon"
import { formatPhoneDisplay, normalizePhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

import { marcarAsistencia } from "./actions"

export type ItemPase = {
  asignacionId: string
  nombre: string
  congregacion: string
  areaNombre: string
  puesto: string
  telefono: string | null
  asistencia: "presente" | "necesita_remplazo" | null
}

export function ListaPase({ items }: { items: ItemPase[] }) {
  // Agrupados por área (los items ya vienen ordenados por área y nombre).
  const grupos: { area: string; items: ItemPase[] }[] = []
  for (const item of items) {
    let grupo = grupos.find((g) => g.area === item.areaNombre)
    if (!grupo) {
      grupo = { area: item.areaNombre, items: [] }
      grupos.push(grupo)
    }
    grupo.items.push(item)
  }

  return (
    <div className="mt-6 grid gap-6">
      {grupos.map((grupo) => (
        <div key={grupo.area || "sin-area"}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {grupo.area || "Sin área"}
          </h2>
          <ul className="grid gap-3">
            {grupo.items.map((item) => (
              <FilaPase key={item.asignacionId} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function FilaPase({ item }: { item: ItemPase }) {
  const router = useRouter()
  const [estado, setEstado] = React.useState(item.asistencia)
  const [pending, setPending] = React.useState<
    "presente" | "necesita_remplazo" | "cancelar" | null
  >(null)
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)

  async function marcar(accion: "presente" | "necesita_remplazo" | "cancelar") {
    if (pending) return
    const previo = estado
    setEstado(accion === "cancelar" ? null : accion)
    setPending(accion)
    setError(null)
    const { ok, error: err } = await marcarAsistencia({
      asignacionId: item.asignacionId,
      estado: accion,
    })
    setPending(null)
    if (!ok) {
      setEstado(previo)
      setError(err)
      return
    }
    router.refresh()
  }

  const digits = item.telefono ? normalizePhone(item.telefono) : ""

  return (
    <li className="rounded-xl border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
          {item.nombre}
        </span>
        {estado === "presente" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-600/40 bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <CheckIcon className="size-3" />
            Vino
          </span>
        )}
        {estado === "necesita_remplazo" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
            <UserRoundXIcon className="size-3" />
            Reemplazo
          </span>
        )}
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            {item.congregacion}
            {item.congregacion && " · "}
            {item.puesto}
            {digits && ` · ${formatPhoneDisplay(digits)}`}
          </p>

          {digits && (
            <div className="mt-3 flex gap-2">
              <a
                href={`tel:${digits}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <PhoneIcon className="size-3.5" />
                Llamar
              </a>
              <a
                href={`https://wa.me/52${digits}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-600/15 dark:text-emerald-400"
              >
                <WhatsappIcon className="size-3.5" />
                WhatsApp
              </a>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => marcar("presente")}
              disabled={pending !== null}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60",
                estado === "presente"
                  ? "border-emerald-600/50 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                  : "border-border bg-background text-muted-foreground hover:border-emerald-600/40 hover:text-foreground",
              )}
            >
              <CheckIcon className="size-3.5" />
              {pending === "presente" ? "Guardando…" : "Vino"}
            </button>
            <button
              type="button"
              onClick={() => marcar("necesita_remplazo")}
              disabled={pending !== null}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60",
                estado === "necesita_remplazo"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-border bg-background text-muted-foreground hover:border-destructive/40 hover:text-foreground",
              )}
            >
              <UserRoundXIcon className="size-3.5" />
              {pending === "necesita_remplazo"
                ? "Guardando…"
                : "Solicitar reemplazo"}
            </button>
          </div>

          {estado === "necesita_remplazo" && (
            <button
              type="button"
              onClick={() => marcar("cancelar")}
              disabled={pending !== null}
              className="mt-2 w-full text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
            >
              {pending === "cancelar"
                ? "Cancelando…"
                : "Cancelar reemplazo (ya no lo necesito)"}
            </button>
          )}

          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </li>
  )
}

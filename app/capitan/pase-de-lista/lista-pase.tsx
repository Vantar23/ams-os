"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, UserRoundXIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { marcarAsistencia } from "./actions"

export type ItemPase = {
  asignacionId: string
  nombre: string
  congregacion: string
  puesto: string
  asistencia: "presente" | "necesita_remplazo" | null
}

export function ListaPase({ items }: { items: ItemPase[] }) {
  return (
    <ul className="mt-6 grid gap-3">
      {items.map((item) => (
        <FilaPase key={item.asignacionId} item={item} />
      ))}
    </ul>
  )
}

function FilaPase({ item }: { item: ItemPase }) {
  const router = useRouter()
  const [estado, setEstado] = React.useState(item.asistencia)
  const [pending, setPending] = React.useState<
    "presente" | "necesita_remplazo" | null
  >(null)
  const [error, setError] = React.useState<string | null>(null)

  async function marcar(nuevo: "presente" | "necesita_remplazo") {
    if (pending) return
    const previo = estado
    setEstado(nuevo)
    setPending(nuevo)
    setError(null)
    const { ok, error: err } = await marcarAsistencia({
      asignacionId: item.asignacionId,
      estado: nuevo,
    })
    setPending(null)
    if (!ok) {
      setEstado(previo)
      setError(err)
      return
    }
    router.refresh()
  }

  return (
    <li className="rounded-xl border bg-surface p-4">
      <p className="text-base font-medium text-foreground">{item.nombre}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {item.congregacion}
        {item.congregacion && " · "}
        {item.puesto}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
          {pending === "necesita_remplazo" ? "Guardando…" : "Necesita reemplazo"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </li>
  )
}

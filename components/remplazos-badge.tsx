"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { createRealtimeClient } from "@/lib/supabase/realtime"

const POLL_MS = 20000

/**
 * Globito con los puestos que necesitan reemplazo, para el item "Remplazos"
 * del sidebar. Se actualiza por Realtime (cambios en asignaciones), por sondeo
 * de respaldo y al cambiar de ruta; al resolver un reemplazo el estado del
 * puesto se reinicia y el globito baja.
 */
export function RemplazosBadge() {
  const pathname = usePathname()
  const [count, setCount] = React.useState(0)

  const recargar = React.useCallback(async () => {
    const supabase = createClient()
    const { data: asambleas } = await supabase
      .from("asambleas")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
    const asambleaId = asambleas?.[0]?.id as string | undefined
    if (!asambleaId) return
    const { count: n } = await supabase
      .from("asignaciones")
      .select("id", { count: "exact", head: true })
      .eq("asamblea_id", asambleaId)
      .eq("asistencia", "necesita_remplazo")
    setCount(n ?? 0)
  }, [])

  // Carga inicial, sondeo y recarga al navegar (p. ej. al resolver un
  // reemplazo en /remplazos).
  React.useEffect(() => {
    const inicial = setTimeout(() => void recargar(), 0)
    const interval = setInterval(() => void recargar(), POLL_MS)
    const onFocus = () => void recargar()
    window.addEventListener("focus", onFocus)
    return () => {
      clearTimeout(inicial)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [recargar])

  React.useEffect(() => {
    const t = setTimeout(() => void recargar(), 800)
    return () => clearTimeout(t)
  }, [pathname, recargar])

  // Realtime: cualquier cambio en asignaciones recalcula el contador.
  React.useEffect(() => {
    let cancelado = false
    let cleanup: (() => void) | null = null
    createRealtimeClient().then((supabase) => {
      if (cancelado) return
      const channel = supabase
        .channel("remplazos-badge")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "asignaciones" },
          () => void recargar(),
        )
        .subscribe()
      cleanup = () => {
        supabase.removeChannel(channel)
      }
    })
    return () => {
      cancelado = true
      cleanup?.()
    }
  }, [recargar])

  if (count === 0) return null

  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  )
}

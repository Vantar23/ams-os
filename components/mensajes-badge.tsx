"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { createRealtimeClient } from "@/lib/supabase/realtime"

const POLL_MS = 20000

/**
 * Globito con los mensajes del personal sin leer, para el item "Mensajes"
 * del sidebar. Se actualiza por Realtime, por sondeo de respaldo y al
 * cambiar de ruta; al abrir la conversación los mensajes se marcan leídos y
 * el globito desaparece.
 */
export function MensajesBadge() {
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
      .from("mensajes")
      .select("id", { count: "exact", head: true })
      .eq("asamblea_id", asambleaId)
      .eq("remitente", "persona")
      .eq("leido", false)
    setCount(n ?? 0)
  }, [])

  // Carga inicial, sondeo y recarga al navegar (p. ej. al abrir /mensajes,
  // donde se marcan leídos).
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

  // Realtime: cualquier cambio en mensajes recalcula el contador.
  React.useEffect(() => {
    let cancelado = false
    let cleanup: (() => void) | null = null
    createRealtimeClient().then((supabase) => {
      if (cancelado) return
      const channel = supabase
        .channel("mensajes-badge")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mensajes" },
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

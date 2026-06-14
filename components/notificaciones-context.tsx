"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { createRealtimeClient } from "@/lib/supabase/realtime"

const POLL_MS = 20000

type Notificaciones = {
  /** Mensajes del personal sin leer. */
  mensajes: number
  /** Puestos que necesitan reemplazo. */
  remplazos: number
}

const NotificacionesContext = React.createContext<Notificaciones>({
  mensajes: 0,
  remplazos: 0,
})

/**
 * Fuente única de los contadores de notificaciones del panel (mensajes sin
 * leer y puestos por reemplazar). Vive en el layout, así que sigue montada
 * aunque el sidebar (y sus globitos) se cierre en móvil; eso permite pintar la
 * bolita en el botón hamburguesa cuando el menú está oculto. Se actualiza por
 * Realtime, por sondeo de respaldo y al cambiar de ruta.
 *
 * `enabled` lo apaga para roles que no ven estos avisos (p. ej. capitán).
 */
export function NotificacionesProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mensajes, setMensajes] = React.useState(0)
  const [remplazos, setRemplazos] = React.useState(0)

  const recargar = React.useCallback(async () => {
    const supabase = createClient()
    const { data: asambleas } = await supabase
      .from("asambleas")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
    const asambleaId = asambleas?.[0]?.id as string | undefined
    if (!asambleaId) return
    const [mensajesRes, remplazosRes] = await Promise.all([
      supabase
        .from("mensajes")
        .select("id", { count: "exact", head: true })
        .eq("asamblea_id", asambleaId)
        .eq("remitente", "persona")
        .eq("leido", false),
      supabase
        .from("asignaciones")
        .select("id", { count: "exact", head: true })
        .eq("asamblea_id", asambleaId)
        .eq("asistencia", "necesita_remplazo"),
    ])
    setMensajes(mensajesRes.count ?? 0)
    setRemplazos(remplazosRes.count ?? 0)
  }, [])

  // Carga inicial, sondeo y recarga al enfocar la pestaña.
  React.useEffect(() => {
    if (!enabled) return
    const inicial = setTimeout(() => void recargar(), 0)
    const interval = setInterval(() => void recargar(), POLL_MS)
    const onFocus = () => void recargar()
    window.addEventListener("focus", onFocus)
    return () => {
      clearTimeout(inicial)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [enabled, recargar])

  // Recarga al navegar (al abrir /mensajes se marcan leídos y al resolver en
  // /remplazos baja el contador).
  React.useEffect(() => {
    if (!enabled) return
    const t = setTimeout(() => void recargar(), 800)
    return () => clearTimeout(t)
  }, [enabled, pathname, recargar])

  // Realtime: cambios en mensajes o asignaciones recalculan los contadores.
  React.useEffect(() => {
    if (!enabled) return
    let cancelado = false
    let cleanup: (() => void) | null = null
    createRealtimeClient().then((supabase) => {
      if (cancelado) return
      const channel = supabase
        .channel("notificaciones")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mensajes" },
          () => void recargar(),
        )
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
  }, [enabled, recargar])

  const value = React.useMemo(
    () => ({ mensajes, remplazos }),
    [mensajes, remplazos],
  )

  return (
    <NotificacionesContext.Provider value={value}>
      {children}
    </NotificacionesContext.Provider>
  )
}

export function useNotificaciones() {
  return React.useContext(NotificacionesContext)
}

/** Verdadero si hay cualquier notificación pendiente (para la bolita). */
export function useHayNotificaciones() {
  const { mensajes, remplazos } = useNotificaciones()
  return mensajes > 0 || remplazos > 0
}

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AlertOctagonIcon, MessageCircleIcon, XIcon } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

const TOAST_MS = 8000

type Alerta = {
  id: number
  href: string
  titulo: string
  detalle: string
  icono: "incidencia" | "mensaje"
}

/**
 * Escucha inserts de `incidencias` y `mensajes` por Realtime y muestra
 * notificaciones flotantes en el panel. También refresca la ruta activa para
 * que las listas se actualicen sin recargar.
 */
export function RealtimeAlerts({ asambleaId }: { asambleaId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = React.useRef(pathname)
  React.useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const [alertas, setAlertas] = React.useState<Alerta[]>([])
  const nextId = React.useRef(1)

  const push = React.useCallback((alerta: Omit<Alerta, "id">) => {
    const id = nextId.current++
    setAlertas((prev) => [...prev, { ...alerta, id }])
    setTimeout(() => {
      setAlertas((prev) => prev.filter((a) => a.id !== id))
    }, TOAST_MS)
  }, [])

  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`alertas-${asambleaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incidencias",
          filter: `asamblea_id=eq.${asambleaId}`,
        },
        (payload) => {
          const fila = payload.new as {
            tipo?: string
            ubicacion?: string | null
          }
          push({
            href: "/incidencias",
            titulo: "Nueva incidencia",
            detalle: [fila.tipo, fila.ubicacion].filter(Boolean).join(" · "),
            icono: "incidencia",
          })
          if (pathnameRef.current.startsWith("/incidencias")) {
            router.refresh()
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `asamblea_id=eq.${asambleaId}`,
        },
        (payload) => {
          const fila = payload.new as {
            remitente?: string
            persona_tipo?: string
            cuerpo?: string
          }
          if (fila.remitente !== "persona") return
          // En /mensajes la página ya se actualiza sola.
          if (pathnameRef.current.startsWith("/mensajes")) return
          push({
            href: "/mensajes",
            titulo:
              fila.persona_tipo === "hermana"
                ? "Nuevo mensaje de una hermana de apoyo"
                : "Nuevo mensaje de un acomodador",
            detalle: fila.cuerpo ?? "",
            icono: "mensaje",
          })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [asambleaId, push, router])

  if (alertas.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {alertas.map((a) => (
        <div
          key={a.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        >
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {a.icono === "incidencia" ? (
              <AlertOctagonIcon className="size-4" />
            ) : (
              <MessageCircleIcon className="size-4" />
            )}
          </span>
          <Link
            href={a.href}
            className="min-w-0 flex-1"
            onClick={() => setAlertas((prev) => prev.filter((x) => x.id !== a.id))}
          >
            <p className="text-sm font-medium">{a.titulo}</p>
            {a.detalle && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {a.detalle}
              </p>
            )}
          </Link>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => setAlertas((prev) => prev.filter((x) => x.id !== a.id))}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

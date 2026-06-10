"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AlertOctagonIcon, BellIcon, MessageCircleIcon, XIcon } from "lucide-react"

import { createRealtimeClient } from "@/lib/supabase/realtime"
import { createClient } from "@/lib/supabase/client"

const TOAST_MS = 8000
const POLL_MS = 20000
// Versionado: al subir la versión, el aviso reaparece una vez para todos
// (también para quienes lo descartaron con la versión anterior).
const NOTIF_PROMPT_KEY = "ams-os.notif-prompt-descartado-v2"

type Alerta = {
  id: number
  href: string
  titulo: string
  detalle: string
  icono: "incidencia" | "mensaje"
}

type IncidenciaEvento = {
  id?: string
  tipo?: string
  ubicacion?: string | null
  created_at?: string
}

type MensajeEvento = {
  id?: string
  remitente?: string
  persona_tipo?: string
  cuerpo?: string
  created_at?: string
}

/**
 * Avisa de incidencias y mensajes nuevos en el panel. Usa Realtime con el
 * JWT del usuario y, por si el socket falla (proxy, red, pestaña dormida),
 * un sondeo de respaldo cada 20 s. Un registro solo notifica una vez.
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
  const vistos = React.useRef(new Set<string>())
  // Solo notifica lo creado después de abrir el panel.
  const desdeRef = React.useRef<string>(new Date().toISOString())

  // Permiso de notificaciones nativas del navegador.
  const [pedirPermiso, setPedirPermiso] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (typeof Notification === "undefined") return
      const descartado = window.localStorage.getItem(NOTIF_PROMPT_KEY) === "1"
      setPedirPermiso(Notification.permission === "default" && !descartado)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  async function activarNotificaciones() {
    if (typeof Notification === "undefined") return
    await Notification.requestPermission()
    setPedirPermiso(false)
  }

  function descartarPrompt() {
    window.localStorage.setItem(NOTIF_PROMPT_KEY, "1")
    setPedirPermiso(false)
  }

  const notificarNavegador = React.useCallback(
    (titulo: string, detalle: string, href: string, tag: string) => {
      if (typeof Notification === "undefined") return
      if (Notification.permission !== "granted") return
      // Con la pestaña visible ya se ve el toast; el aviso nativo es para
      // cuando estás en otra ventana o pestaña.
      if (document.visibilityState === "visible") return
      try {
        const n = new Notification(titulo, {
          body: detalle,
          tag,
          icon: "/favicon.ico",
        })
        n.onclick = () => {
          window.focus()
          router.push(href)
          n.close()
        }
      } catch {
        /* algunos navegadores móviles no soportan el constructor */
      }
    },
    [router],
  )

  const push = React.useCallback((alerta: Omit<Alerta, "id">) => {
    const id = nextId.current++
    setAlertas((prev) => [...prev, { ...alerta, id }])
    setTimeout(() => {
      setAlertas((prev) => prev.filter((a) => a.id !== id))
    }, TOAST_MS)
  }, [])

  const notificarIncidencia = React.useCallback(
    (fila: IncidenciaEvento) => {
      const key = `inc:${fila.id ?? ""}`
      if (!fila.id || vistos.current.has(key)) return
      vistos.current.add(key)
      const detalle = [fila.tipo, fila.ubicacion].filter(Boolean).join(" · ")
      push({
        href: "/incidencias",
        titulo: "Nueva incidencia",
        detalle,
        icono: "incidencia",
      })
      notificarNavegador("Nueva incidencia", detalle, "/incidencias", key)
      if (pathnameRef.current.startsWith("/incidencias")) {
        router.refresh()
      }
    },
    [push, notificarNavegador, router],
  )

  const notificarMensaje = React.useCallback(
    (fila: MensajeEvento) => {
      const key = `msg:${fila.id ?? ""}`
      if (!fila.id || fila.remitente !== "persona") return
      if (vistos.current.has(key)) return
      vistos.current.add(key)
      const titulo =
        fila.persona_tipo === "hermana"
          ? "Nuevo mensaje de una hermana de apoyo"
          : "Nuevo mensaje de un acomodador"
      notificarNavegador(titulo, fila.cuerpo ?? "", "/mensajes", key)
      // En /mensajes la página ya se actualiza sola.
      if (pathnameRef.current.startsWith("/mensajes")) return
      push({
        href: "/mensajes",
        titulo,
        detalle: fila.cuerpo ?? "",
        icono: "mensaje",
      })
    },
    [push, notificarNavegador],
  )

  // Realtime con el JWT del usuario.
  React.useEffect(() => {
    let cancelado = false
    let cleanup: (() => void) | null = null
    createRealtimeClient().then((supabase) => {
      if (cancelado) return
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
          (payload) => notificarIncidencia(payload.new as IncidenciaEvento),
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensajes",
            filter: `asamblea_id=eq.${asambleaId}`,
          },
          (payload) => notificarMensaje(payload.new as MensajeEvento),
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
  }, [asambleaId, notificarIncidencia, notificarMensaje])

  // Sondeo de respaldo: cubre sockets bloqueados o eventos perdidos.
  React.useEffect(() => {
    const supabase = createClient()
    let activo = true

    async function sondear() {
      const desde = desdeRef.current
      const [{ data: incs }, { data: msgs }] = await Promise.all([
        supabase
          .from("incidencias")
          .select("id, tipo, ubicacion, created_at")
          .eq("asamblea_id", asambleaId)
          .gt("created_at", desde)
          .order("created_at", { ascending: true })
          .limit(10),
        supabase
          .from("mensajes")
          .select("id, remitente, persona_tipo, cuerpo, created_at")
          .eq("asamblea_id", asambleaId)
          .eq("remitente", "persona")
          .gt("created_at", desde)
          .order("created_at", { ascending: true })
          .limit(10),
      ])
      if (!activo) return
      let max = desde
      for (const fila of (incs ?? []) as IncidenciaEvento[]) {
        notificarIncidencia(fila)
        if (fila.created_at && fila.created_at > max) max = fila.created_at
      }
      for (const fila of (msgs ?? []) as MensajeEvento[]) {
        notificarMensaje(fila)
        if (fila.created_at && fila.created_at > max) max = fila.created_at
      }
      desdeRef.current = max
    }

    const interval = setInterval(() => void sondear(), POLL_MS)
    return () => {
      activo = false
      clearInterval(interval)
    }
  }, [asambleaId, notificarIncidencia, notificarMensaje])

  if (alertas.length === 0 && !pedirPermiso) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {pedirPermiso && (
        <div className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              ¿Activar notificaciones del navegador?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Te avisamos de incidencias y mensajes nuevos aunque estés en
              otra pestaña.
            </p>
            <button
              type="button"
              onClick={activarNotificaciones}
              className="mt-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15"
            >
              Activar
            </button>
          </div>
          <button
            type="button"
            aria-label="Descartar"
            onClick={descartarPrompt}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      )}
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
            onClick={() =>
              setAlertas((prev) => prev.filter((x) => x.id !== a.id))
            }
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
            onClick={() =>
              setAlertas((prev) => prev.filter((x) => x.id !== a.id))
            }
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

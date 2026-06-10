"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { BellIcon, CheckIcon, XIcon } from "lucide-react"

import {
  contarNoLeidosPersonal,
  obtenerVapidKeyPublica,
  suscribirPushPersonal,
  type PersonalTipo,
} from "@/lib/actions/portal-personal"
import {
  esIosSinInstalar,
  soportaPush,
  suscribirNavegador,
  tienePushActivo,
} from "@/lib/push/client"

const POLL_MS = 20000
const PROMPT_KEY = "ams-os.notif-prompt-personal-descartado-v2"
const IOS_HINT_KEY = "ams-os.notif-ios-hint-descartado-v1"

type Estado =
  | { kind: "oculto" }
  | { kind: "hint-ios" }
  | { kind: "prompt" }
  | { kind: "activando" }
  | { kind: "activado" }
  | { kind: "error"; mensaje: string }

/**
 * Notificaciones para los portales de acomodador y hermana de apoyo:
 * Web Push instalable (en iPhone requiere agregar a pantalla de inicio) y
 * aviso local de respaldo mientras la página esté abierta.
 */
export function PortalNotificaciones({
  tipo,
  accessToken,
}: {
  tipo: PersonalTipo
  accessToken: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const base = tipo === "acomodador" ? "/acomodador" : "/hermana-apoyo"
  const mensajesPath = `${base}/${accessToken}/mensajes`

  const pathnameRef = React.useRef(pathname)
  React.useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const [estado, setEstado] = React.useState<Estado>({ kind: "oculto" })
  const vapidKeyRef = React.useRef<string | null>(null)
  const pushActivoRef = React.useRef(false)

  // Precarga la llave pública (así el clic en Activar pide el permiso de
  // inmediato, sin perder el gesto del usuario) y decide qué mostrar.
  React.useEffect(() => {
    let activo = true
    ;(async () => {
      const key = await obtenerVapidKeyPublica().catch(() => null)
      if (!activo) return
      vapidKeyRef.current = key

      if (esIosSinInstalar()) {
        if (window.localStorage.getItem(IOS_HINT_KEY) !== "1") {
          setEstado({ kind: "hint-ios" })
        }
        return
      }
      if (typeof Notification === "undefined") return

      if (Notification.permission === "granted") {
        // Permiso ya dado (p. ej. el guardado anterior falló): re-suscribe
        // y guarda en silencio. El upsert por endpoint lo hace idempotente.
        if (soportaPush() && key) {
          try {
            const sub = await suscribirNavegador(key)
            if (sub) {
              const r = await suscribirPushPersonal(tipo, accessToken, sub)
              if (activo && !r.ok) {
                setEstado({
                  kind: "error",
                  mensaje:
                    "No se pudo activar en este dispositivo. Primero toca «Usar este dispositivo» en la pantalla principal y vuelve a intentar.",
                })
                return
              }
              pushActivoRef.current = true
            }
          } catch {
            /* sin red o push no disponible; queda el aviso local */
          }
        }
        return
      }

      if (
        Notification.permission === "default" &&
        window.localStorage.getItem(PROMPT_KEY) !== "1"
      ) {
        setEstado({ kind: "prompt" })
      }
    })()
    return () => {
      activo = false
    }
  }, [tipo, accessToken])

  async function activarNotificaciones() {
    if (typeof Notification === "undefined") return
    setEstado({ kind: "activando" })
    try {
      if (soportaPush() && vapidKeyRef.current) {
        const sub = await suscribirNavegador(vapidKeyRef.current)
        if (!sub) {
          setEstado({
            kind: "error",
            mensaje: "El permiso no fue concedido o el navegador no soporta avisos.",
          })
          return
        }
        const r = await suscribirPushPersonal(tipo, accessToken, sub)
        if (!r.ok) {
          setEstado({
            kind: "error",
            mensaje:
              "No se pudo registrar este dispositivo. Si tu enlace está activo en otro lado, toca «Usar este dispositivo» en la pantalla principal y reintenta.",
          })
          return
        }
        pushActivoRef.current = true
        setEstado({ kind: "activado" })
        setTimeout(() => setEstado({ kind: "oculto" }), 4000)
      } else {
        const permiso = await Notification.requestPermission()
        setEstado(
          permiso === "granted" ? { kind: "activado" } : { kind: "oculto" },
        )
        if (permiso === "granted") {
          setTimeout(() => setEstado({ kind: "oculto" }), 4000)
        }
      }
    } catch (e) {
      setEstado({
        kind: "error",
        mensaje: `No se pudo activar: ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

  function descartar() {
    if (estado.kind === "hint-ios") {
      window.localStorage.setItem(IOS_HINT_KEY, "1")
    } else {
      window.localStorage.setItem(PROMPT_KEY, "1")
    }
    setEstado({ kind: "oculto" })
  }

  // Aviso local de respaldo mientras la pestaña está abierta.
  React.useEffect(() => {
    let activo = true
    const prev = { n: null as number | null }

    async function revisar() {
      const n = await contarNoLeidosPersonal(tipo, accessToken)
      if (!activo) return
      const anterior = prev.n
      prev.n = n
      if (anterior === null || n <= anterior) return
      if (pathnameRef.current === mensajesPath) return
      if (typeof Notification === "undefined") return
      if (Notification.permission !== "granted") return
      // Si el dispositivo ya recibe Web Push, el service worker avisa solo.
      if (pushActivoRef.current || (await tienePushActivo())) return
      try {
        const notif = new Notification("Mensaje de administración", {
          body:
            n === 1
              ? "Tienes una respuesta nueva en Mensajes."
              : `Tienes ${n} respuestas sin leer en Mensajes.`,
          tag: "portal-mensajes",
          icon: "/icon-192.png",
        })
        notif.onclick = () => {
          window.focus()
          router.push(mensajesPath)
          notif.close()
        }
      } catch {
        /* en iOS el constructor no existe; ahí avisa el push del SW */
      }
    }

    const inicial = setTimeout(() => void revisar(), 0)
    const interval = setInterval(() => void revisar(), POLL_MS)
    const onFocus = () => void revisar()
    window.addEventListener("focus", onFocus)
    return () => {
      activo = false
      clearTimeout(inicial)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [tipo, accessToken, mensajesPath, router])

  if (estado.kind === "oculto") return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] w-80 max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {estado.kind === "activado" ? (
            <CheckIcon className="size-4" />
          ) : (
            <BellIcon className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          {estado.kind === "hint-ios" ? (
            <>
              <p className="text-sm font-medium">Recibe avisos en tu iPhone</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Toca <span className="font-medium">Compartir</span> y luego{" "}
                <span className="font-medium">
                  «Agregar a pantalla de inicio»
                </span>
                . Abre la app desde ahí y activa las notificaciones cuando te
                lo pregunte.
              </p>
            </>
          ) : estado.kind === "activado" ? (
            <p className="text-sm font-medium">Notificaciones activadas ✓</p>
          ) : estado.kind === "error" ? (
            <>
              <p className="text-sm font-medium">No se pudo activar</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {estado.mensaje}
              </p>
              <button
                type="button"
                onClick={activarNotificaciones}
                className="mt-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15"
              >
                Reintentar
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">¿Activar notificaciones?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Te avisamos cuando la administración te conteste.
              </p>
              <button
                type="button"
                onClick={activarNotificaciones}
                disabled={estado.kind === "activando"}
                className="mt-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
              >
                {estado.kind === "activando" ? "Activando…" : "Activar"}
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label="Descartar"
          onClick={descartar}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

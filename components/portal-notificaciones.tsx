"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { BellIcon, XIcon } from "lucide-react"

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

/**
 * Notificaciones para los portales de acomodador y hermana de apoyo:
 * - Web Push (con service worker) para avisos aunque el navegador esté
 *   cerrado; en iPhone requiere agregar la app a la pantalla de inicio,
 *   así que ahí mostramos las instrucciones.
 * - Aviso local de respaldo mientras la página esté abierta.
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

  const [pedirPermiso, setPedirPermiso] = React.useState(false)
  const [hintIos, setHintIos] = React.useState(false)
  const [activando, setActivando] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (esIosSinInstalar()) {
        setHintIos(window.localStorage.getItem(IOS_HINT_KEY) !== "1")
        return
      }
      if (typeof Notification === "undefined") return
      const descartado = window.localStorage.getItem(PROMPT_KEY) === "1"
      setPedirPermiso(Notification.permission === "default" && !descartado)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  async function activarNotificaciones() {
    if (typeof Notification === "undefined") return
    setActivando(true)
    try {
      if (soportaPush()) {
        const key = await obtenerVapidKeyPublica()
        if (key) {
          const sub = await suscribirNavegador(key)
          if (sub) await suscribirPushPersonal(tipo, accessToken, sub)
        }
      } else {
        await Notification.requestPermission()
      }
    } finally {
      setActivando(false)
      setPedirPermiso(false)
    }
  }

  function descartarPrompt() {
    window.localStorage.setItem(PROMPT_KEY, "1")
    setPedirPermiso(false)
  }

  function descartarHint() {
    window.localStorage.setItem(IOS_HINT_KEY, "1")
    setHintIos(false)
  }

  const pushActivoRef = React.useRef(false)
  React.useEffect(() => {
    tienePushActivo().then((v) => {
      pushActivoRef.current = v
    })
  }, [])

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
      if (pushActivoRef.current) return
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

  if (!pedirPermiso && !hintIos) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] w-80 max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BellIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          {hintIos ? (
            <>
              <p className="text-sm font-medium">
                Recibe avisos en tu iPhone
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Toca <span className="font-medium">Compartir</span> y luego{" "}
                <span className="font-medium">
                  «Agregar a pantalla de inicio»
                </span>
                . Abre la app desde ahí y activa las notificaciones cuando te
                lo pregunte.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                ¿Activar notificaciones?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Te avisamos cuando la administración te conteste.
              </p>
              <button
                type="button"
                onClick={activarNotificaciones}
                disabled={activando}
                className="mt-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
              >
                {activando ? "Activando…" : "Activar"}
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label="Descartar"
          onClick={hintIos ? descartarHint : descartarPrompt}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

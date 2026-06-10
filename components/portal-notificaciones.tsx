"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { BellIcon, XIcon } from "lucide-react"

import {
  contarNoLeidosPersonal,
  type PersonalTipo,
} from "@/lib/actions/portal-personal"

const POLL_MS = 20000
const PROMPT_KEY = "ams-os.notif-prompt-personal-descartado"

/**
 * Notificaciones del navegador para los portales de acomodador y hermana de
 * apoyo: ofrece activar el permiso y avisa cuando la administración
 * contesta, salvo que ya estén leyendo el chat.
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
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (typeof Notification === "undefined") return
      const descartado = window.localStorage.getItem(PROMPT_KEY) === "1"
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
    window.localStorage.setItem(PROMPT_KEY, "1")
    setPedirPermiso(false)
  }

  // Sondea las respuestas sin leer; si suben, dispara la notificación.
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
      try {
        const notif = new Notification("Mensaje de administración", {
          body:
            n === 1
              ? "Tienes una respuesta nueva en Mensajes."
              : `Tienes ${n} respuestas sin leer en Mensajes.`,
          tag: "portal-mensajes",
          icon: "/favicon.ico",
        })
        notif.onclick = () => {
          window.focus()
          router.push(mensajesPath)
          notif.close()
        }
      } catch {
        /* algunos navegadores móviles no soportan el constructor */
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

  if (!pedirPermiso) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] w-80 max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BellIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            ¿Activar notificaciones del navegador?
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Te avisamos cuando la administración te conteste.
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
    </div>
  )
}

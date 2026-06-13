"use client"

import * as React from "react"
import { CheckIcon, MegaphoneIcon } from "lucide-react"

import {
  avisosPendientesCapitan,
  responderAvisoCapitan,
} from "@/lib/actions/portal-capitan"
import {
  avisosPendientesPersonal,
  responderAvisoPersonal,
  type AvisoPendiente,
  type PersonalTipo,
} from "@/lib/actions/portal-personal"
import { createRealtimeClient } from "@/lib/supabase/realtime"

const POLL_MS = 15000

type Props =
  | { origen: "personal"; tipo: PersonalTipo; accessToken: string }
  | { origen: "capitan"; asambleaId: string }

/**
 * Muestra a pantalla completa los avisos y preguntas que administración dirige
 * al personal. No se puede cerrar sin responder: un aviso se marca como visto,
 * una pregunta se contesta con la opción A o B. Al responder pasa al siguiente
 * de la cola.
 *
 * Los capitanes tienen sesión, así que además de sondear escuchan Realtime para
 * que el aviso aparezca al instante. Los acomodadores y hermanas (sin sesión)
 * dependen del sondeo cada 15 s, como el resto de sus avisos del portal.
 */
export function AvisosOverlay(props: Props) {
  const [cola, setCola] = React.useState<AvisoPendiente[]>([])
  const [enviando, setEnviando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const respondidos = React.useRef(new Set<string>())

  const cargar = React.useCallback(async () => {
    const data =
      props.origen === "capitan"
        ? await avisosPendientesCapitan()
        : await avisosPendientesPersonal(props.tipo, props.accessToken)
    setCola(data.filter((a) => !respondidos.current.has(a.id)))
  }, [props])

  // Carga inicial + sondeo de respaldo + al recuperar el foco.
  React.useEffect(() => {
    let activo = true
    const tick = () => {
      if (activo) void cargar()
    }
    tick()
    const interval = setInterval(tick, POLL_MS)
    window.addEventListener("focus", tick)
    return () => {
      activo = false
      clearInterval(interval)
      window.removeEventListener("focus", tick)
    }
  }, [cargar])

  // Realtime solo para el capitán (tiene JWT). Al insertarse un aviso en su
  // asamblea, recarga la cola (la RPC filtra audiencia y caducidad).
  React.useEffect(() => {
    if (props.origen !== "capitan") return
    const asambleaId = props.asambleaId
    let cancelado = false
    let cleanup: (() => void) | null = null
    createRealtimeClient().then((supabase) => {
      if (cancelado) return
      const channel = supabase
        .channel(`avisos-${asambleaId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "avisos",
            filter: `asamblea_id=eq.${asambleaId}`,
          },
          () => void cargar(),
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
  }, [props, cargar])

  const actual = cola[0]
  if (!actual) return null

  async function responder(opcion?: "a" | "b") {
    if (!actual || enviando) return
    setEnviando(true)
    setError(null)
    const r =
      props.origen === "capitan"
        ? await responderAvisoCapitan(actual.id, opcion)
        : await responderAvisoPersonal(
            props.tipo,
            props.accessToken,
            actual.id,
            opcion,
          )
    setEnviando(false)
    if (!r.ok) {
      setError("No se pudo registrar. Revisa tu conexión e inténtalo de nuevo.")
      return
    }
    respondidos.current.add(actual.id)
    setCola((prev) => prev.filter((a) => a.id !== actual.id))
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-background/98 supports-backdrop-filter:backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MegaphoneIcon className="size-7" />
          </span>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {actual.tipo === "pregunta" ? "Pregunta de administración" : "Aviso de administración"}
          </p>
          <h2 className="text-balance text-2xl font-semibold leading-tight">
            {actual.titulo}
          </h2>
          {actual.cuerpo && (
            <p className="whitespace-pre-wrap text-pretty text-base text-muted-foreground">
              {actual.cuerpo}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {actual.tipo === "pregunta" ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={enviando}
              onClick={() => void responder("a")}
              className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 text-center text-base font-medium text-foreground transition hover:bg-primary/10 disabled:opacity-60"
            >
              {actual.opcion_a}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => void responder("b")}
              className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 text-center text-base font-medium text-foreground transition hover:bg-primary/10 disabled:opacity-60"
            >
              {actual.opcion_b}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={enviando}
            onClick={() => void responder()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            <CheckIcon className="size-5" />
            {enviando ? "Guardando…" : "Entendido"}
          </button>
        )}

        {cola.length > 1 && (
          <p className="text-center text-xs text-muted-foreground">
            {cola.length - 1}{" "}
            {cola.length - 1 === 1 ? "aviso más pendiente" : "avisos más pendientes"}
          </p>
        )}
      </div>
    </div>
  )
}

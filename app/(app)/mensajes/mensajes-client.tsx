"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

import { enviarRespuestaAdmin, marcarMensajesLeidos } from "./actions"

export type MensajeRow = {
  id: string
  persona_tipo: "acomodador" | "hermana"
  persona_id: string
  remitente: "persona" | "admin"
  cuerpo: string
  leido: boolean
  created_at: string
}

export type PersonaInfo = {
  id: string
  tipo: "acomodador" | "hermana"
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
}

type Asamblea = { id: string; numero: string; edicion: string }

type Conversacion = {
  key: string
  tipo: "acomodador" | "hermana"
  personaId: string
  nombre: string
  congregacion: string
  ultimo: MensajeRow
  noLeidos: number
  mensajes: MensajeRow[]
}

export function MensajesClient({
  asamblea,
  mensajes,
  personas,
}: {
  asamblea: Asamblea
  mensajes: MensajeRow[]
  personas: PersonaInfo[]
}) {
  const router = useRouter()
  const [seleccionada, setSeleccionada] = React.useState<string | null>(null)

  const personaByKey = React.useMemo(() => {
    const map = new Map<string, PersonaInfo>()
    for (const p of personas) map.set(`${p.tipo}:${p.id}`, p)
    return map
  }, [personas])

  const conversaciones = React.useMemo(() => {
    const byKey = new Map<string, Conversacion>()
    for (const m of mensajes) {
      const key = `${m.persona_tipo}:${m.persona_id}`
      const persona = personaByKey.get(key)
      let conv = byKey.get(key)
      if (!conv) {
        conv = {
          key,
          tipo: m.persona_tipo,
          personaId: m.persona_id,
          nombre: persona
            ? `${persona.nombre} ${persona.apellido}`.trim()
            : m.persona_tipo === "acomodador"
              ? "Acomodador"
              : "Hermana de apoyo",
          congregacion: persona?.congregacion ?? "",
          ultimo: m,
          noLeidos: 0,
          mensajes: [],
        }
        byKey.set(key, conv)
      }
      conv.mensajes.push(m)
      conv.ultimo = m
      if (m.remitente === "persona" && !m.leido) conv.noLeidos += 1
    }
    return Array.from(byKey.values()).sort((a, b) =>
      b.ultimo.created_at.localeCompare(a.ultimo.created_at),
    )
  }, [mensajes, personaByKey])

  const conversacion =
    conversaciones.find((c) => c.key === seleccionada) ?? null

  // Suscripción realtime: cualquier mensaje nuevo en la asamblea refresca
  // los datos del servidor.
  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`mensajes-${asamblea.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `asamblea_id=eq.${asamblea.id}`,
        },
        () => router.refresh(),
      )
      .subscribe()
    const onFocus = () => router.refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener("focus", onFocus)
    }
  }, [asamblea.id, router])

  // Marca como leída la conversación abierta cuando llegan mensajes nuevos.
  const noLeidosAbiertos = conversacion?.noLeidos ?? 0
  React.useEffect(() => {
    if (!conversacion || noLeidosAbiertos === 0) return
    marcarMensajesLeidos({
      asambleaId: asamblea.id,
      personaTipo: conversacion.tipo,
      personaId: conversacion.personaId,
    }).then(() => router.refresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacion?.key, noLeidosAbiertos, asamblea.id])

  const totalNoLeidos = conversaciones.reduce((s, c) => s + c.noLeidos, 0)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">Mensajes</h2>
        <p className="text-sm text-muted-foreground">
          {conversaciones.length} conversaci
          {conversaciones.length === 1 ? "ón" : "ones"}
          {totalNoLeidos > 0 && (
            <>
              {" · "}
              <span className="text-amber-700 dark:text-amber-400">
                {totalNoLeidos} sin leer
              </span>
            </>
          )}{" "}
          · Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
      </div>

      <div className="grid flex-1 gap-4 md:grid-cols-[280px_1fr]">
        {/* Lista de conversaciones */}
        <div
          className={cn(
            "flex flex-col gap-1 md:flex",
            conversacion ? "hidden" : "flex",
          )}
        >
          {conversaciones.length === 0 ? (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
              Aún no hay mensajes. Cuando un acomodador o una hermana de apoyo
              te escriba desde su portal, aparecerá aquí.
            </div>
          ) : (
            conversaciones.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSeleccionada(c.key)}
                className={cn(
                  "rounded-xl border bg-surface p-3 text-left transition-colors hover:border-primary/50",
                  seleccionada === c.key && "border-primary/60 bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {c.nombre}
                  </span>
                  {c.noLeidos > 0 && (
                    <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {c.noLeidos}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {c.tipo === "acomodador" ? "Acomodador" : "Hermana de apoyo"}
                  {c.congregacion && ` · ${c.congregacion}`}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {c.ultimo.remitente === "admin" ? "Tú: " : ""}
                  {c.ultimo.cuerpo}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Hilo */}
        <div
          className={cn(
            "min-h-[50svh] flex-col md:flex",
            conversacion ? "flex" : "hidden",
          )}
        >
          {conversacion ? (
            <Hilo
              key={conversacion.key}
              asambleaId={asamblea.id}
              conversacion={conversacion}
              onVolver={() => setSeleccionada(null)}
              onEnviado={() => router.refresh()}
            />
          ) : (
            <div className="hidden flex-1 items-center justify-center rounded-xl border text-sm text-muted-foreground md:flex">
              Elige una conversación para leerla y contestar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Hilo({
  asambleaId,
  conversacion,
  onVolver,
  onEnviado,
}: {
  asambleaId: string
  conversacion: Conversacion
  onVolver: () => void
  onEnviado: () => void
}) {
  const [cuerpo, setCuerpo] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const bottomRef = React.useRef<HTMLDivElement | null>(null)
  const countRef = React.useRef(0)

  React.useEffect(() => {
    if (conversacion.mensajes.length > countRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" })
    }
    countRef.current = conversacion.mensajes.length
  }, [conversacion.mensajes.length])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const texto = cuerpo.trim()
    if (!texto || sending) return
    setSending(true)
    setError(null)
    const { ok, error: err } = await enviarRespuestaAdmin({
      asambleaId,
      personaTipo: conversacion.tipo,
      personaId: conversacion.personaId,
      cuerpo: texto,
    })
    setSending(false)
    if (!ok) {
      setError(err ?? "No se pudo enviar.")
      return
    }
    setCuerpo("")
    onEnviado()
  }

  return (
    <div className="flex flex-1 flex-col rounded-xl border bg-surface">
      <div className="flex items-center gap-2 border-b p-3">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Volver a la lista"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {conversacion.nombre}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {conversacion.tipo === "acomodador"
              ? "Acomodador"
              : "Hermana de apoyo"}
            {conversacion.congregacion && ` · ${conversacion.congregacion}`}
          </p>
        </div>
      </div>

      <div className="flex max-h-[55svh] flex-1 flex-col gap-2 overflow-y-auto p-4">
        {conversacion.mensajes.map((m) => (
          <div
            key={m.id}
            className={
              m.remitente === "admin"
                ? "ml-8 self-end rounded-2xl rounded-br-sm bg-primary/10 px-3.5 py-2 text-sm text-foreground"
                : "mr-8 self-start rounded-2xl rounded-bl-sm border border-border bg-background px-3.5 py-2 text-sm text-foreground"
            }
          >
            <p className="whitespace-pre-wrap break-words">{m.cuerpo}</p>
            <p className="mt-0.5 text-right text-[10px] text-muted-foreground">
              {formatHora(m.created_at)}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 text-sm text-destructive">{error}</p>}

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t p-3">
        <textarea
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Escribe tu respuesta…"
          className="min-h-11 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <Button
          type="submit"
          disabled={sending || !cuerpo.trim()}
          aria-label="Enviar respuesta"
        >
          <SendIcon className="size-4" />
          Enviar
        </Button>
      </form>
    </div>
  )
}

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

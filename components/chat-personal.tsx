"use client"

import * as React from "react"
import { SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  enviarMensajePersonal,
  listarMensajesPersonal,
  type MensajePersonal,
  type PersonalTipo,
} from "@/lib/actions/portal-personal"

const POLL_MS = 5000

/**
 * Conversación del personal con el equipo administrador. Refresca cada pocos
 * segundos (y al volver a la pestaña) para recibir respuestas casi en vivo.
 */
export function ChatPersonal({
  tipo,
  accessToken,
}: {
  tipo: PersonalTipo
  accessToken: string
}) {
  const [mensajes, setMensajes] = React.useState<MensajePersonal[] | null>(null)
  const [cuerpo, setCuerpo] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const bottomRef = React.useRef<HTMLDivElement | null>(null)
  const countRef = React.useRef(0)

  const cargar = React.useCallback(async () => {
    const { ok, mensajes: lista } = await listarMensajesPersonal(
      tipo,
      accessToken,
    )
    if (ok) setMensajes(lista)
  }, [tipo, accessToken])

  React.useEffect(() => {
    const inicial = setTimeout(() => void cargar(), 0)
    const interval = setInterval(() => void cargar(), POLL_MS)
    const onFocus = () => void cargar()
    window.addEventListener("focus", onFocus)
    return () => {
      clearTimeout(inicial)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [cargar])

  React.useEffect(() => {
    const count = mensajes?.length ?? 0
    if (count > countRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" })
    }
    countRef.current = count
  }, [mensajes])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const texto = cuerpo.trim()
    if (!texto || sending) return
    setSending(true)
    setError(null)
    const { ok, error: err } = await enviarMensajePersonal(
      tipo,
      accessToken,
      texto,
    )
    setSending(false)
    if (!ok) {
      setError(err ?? "No se pudo enviar el mensaje.")
      return
    }
    setCuerpo("")
    await cargar()
  }

  return (
    <div className="mt-6 flex flex-col">
      <div className="flex max-h-[55svh] min-h-48 flex-col gap-2 overflow-y-auto rounded-xl border bg-surface p-4">
        {mensajes === null ? (
          <p className="m-auto text-sm text-muted-foreground">
            Cargando mensajes…
          </p>
        ) : mensajes.length === 0 ? (
          <p className="m-auto text-center text-sm text-muted-foreground">
            Aún no hay mensajes. Escribe el primero y el equipo de
            administración te contestará aquí.
          </p>
        ) : (
          mensajes.map((m) => (
            <div
              key={m.id}
              className={
                m.remitente === "persona"
                  ? "ml-8 self-end rounded-2xl rounded-br-sm bg-primary/10 px-3.5 py-2 text-sm text-foreground"
                  : "mr-8 self-start rounded-2xl rounded-bl-sm border border-border bg-background px-3.5 py-2 text-sm text-foreground"
              }
            >
              <p className="whitespace-pre-wrap break-words">{m.cuerpo}</p>
              <p className="mt-0.5 text-right text-[10px] text-muted-foreground">
                {m.remitente === "admin" ? "Administración · " : ""}
                {formatHora(m.created_at)}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Escribe tu mensaje…"
          className="min-h-12 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <Button
          type="submit"
          size="lg"
          disabled={sending || !cuerpo.trim()}
          className="h-12"
          aria-label="Enviar mensaje"
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

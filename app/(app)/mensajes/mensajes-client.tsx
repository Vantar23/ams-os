"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  MegaphoneIcon,
  MessageSquarePlusIcon,
  SendIcon,
} from "lucide-react"

import {
  BuscadorPersonal,
  coincideBusqueda,
} from "@/components/buscador-personal"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createRealtimeClient } from "@/lib/supabase/realtime"
import { cn } from "@/lib/utils"

import {
  enviarMensajeMasivo,
  enviarRespuestaAdmin,
  marcarMensajesLeidos,
} from "./actions"

export type PersonaTipo = "acomodador" | "hermana" | "capitan"

export type MensajeRow = {
  id: string
  persona_tipo: PersonaTipo
  persona_id: string
  remitente: "persona" | "admin"
  cuerpo: string
  leido: boolean
  created_at: string
}

export type PersonaInfo = {
  id: string
  tipo: PersonaTipo
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
}

type Asamblea = { id: string; numero: string; edicion: string }

type Conversacion = {
  key: string
  tipo: PersonaTipo
  personaId: string
  nombre: string
  congregacion: string
  ultimo: MensajeRow | null
  noLeidos: number
  mensajes: MensajeRow[]
}

const TIPO_LABEL: Record<PersonaTipo, string> = {
  acomodador: "Acomodador",
  hermana: "Hermana de apoyo",
  capitan: "Capitán",
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
  const [directorioAbierto, setDirectorioAbierto] = React.useState(false)
  const [avisoAbierto, setAvisoAbierto] = React.useState(false)

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
            : TIPO_LABEL[m.persona_tipo],
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
      (b.ultimo?.created_at ?? "").localeCompare(a.ultimo?.created_at ?? ""),
    )
  }, [mensajes, personaByKey])

  // La conversación abierta: la existente o, si se eligió a alguien desde el
  // directorio sin mensajes previos, un hilo vacío para iniciar el DM.
  const conversacion = React.useMemo<Conversacion | null>(() => {
    if (!seleccionada) return null
    const existente = conversaciones.find((c) => c.key === seleccionada)
    if (existente) return existente
    const persona = personaByKey.get(seleccionada)
    if (!persona) return null
    return {
      key: seleccionada,
      tipo: persona.tipo,
      personaId: persona.id,
      nombre: `${persona.nombre} ${persona.apellido}`.trim(),
      congregacion: persona.congregacion,
      ultimo: null,
      noLeidos: 0,
      mensajes: [],
    }
  }, [seleccionada, conversaciones, personaByKey])

  // Suscripción realtime (con el JWT del usuario — sin él, RLS no entrega
  // eventos) + sondeo de respaldo por si el socket falla.
  React.useEffect(() => {
    let cancelado = false
    let cleanup: (() => void) | null = null
    createRealtimeClient().then((supabase) => {
      if (cancelado) return
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
      cleanup = () => {
        supabase.removeChannel(channel)
      }
    })
    const interval = setInterval(() => router.refresh(), 15000)
    const onFocus = () => router.refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelado = true
      cleanup?.()
      clearInterval(interval)
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
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
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAvisoAbierto(true)}
          >
            <MegaphoneIcon className="size-4" />
            Aviso a todos
          </Button>
          <Button type="button" onClick={() => setDirectorioAbierto(true)}>
            <MessageSquarePlusIcon className="size-4" />
            Nuevo mensaje
          </Button>
        </div>
      </div>

      <DirectorioDialog
        open={directorioAbierto}
        onOpenChange={setDirectorioAbierto}
        personas={personas}
        onSeleccionar={(key) => {
          setSeleccionada(key)
          setDirectorioAbierto(false)
        }}
      />

      <AvisoDialog
        open={avisoAbierto}
        onOpenChange={setAvisoAbierto}
        asambleaId={asamblea.id}
        personas={personas}
        onEnviado={() => router.refresh()}
      />

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
                  {TIPO_LABEL[c.tipo]}
                  {c.congregacion && ` · ${c.congregacion}`}
                </p>
                {c.ultimo && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {c.ultimo.remitente === "admin" ? "Tú: " : ""}
                    {c.ultimo.cuerpo}
                  </p>
                )}
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

/** Envía el mismo mensaje a todos los acomodadores, hermanas o ambos. */
function AvisoDialog({
  open,
  onOpenChange,
  asambleaId,
  personas,
  onEnviado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  asambleaId: string
  personas: PersonaInfo[]
  onEnviado: () => void
}) {
  const [destinatarios, setDestinatarios] = React.useState<
    "acomodadores" | "hermanas" | "capitanes" | "todos"
  >("acomodadores")
  const [cuerpo, setCuerpo] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const totales = React.useMemo(() => {
    const acomodadores = personas.filter((p) => p.tipo === "acomodador").length
    const hermanas = personas.filter((p) => p.tipo === "hermana").length
    const capitanes = personas.filter((p) => p.tipo === "capitan").length
    return { acomodadores, hermanas, capitanes, todos: personas.length }
  }, [personas])
  const total = totales[destinatarios]

  function handleOpenChange(next: boolean) {
    if (sending) return
    if (!next) {
      setCuerpo("")
      setError(null)
    }
    onOpenChange(next)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const texto = cuerpo.trim()
    if (!texto || sending) return
    setSending(true)
    setError(null)
    const { ok, error: err } = await enviarMensajeMasivo({
      asambleaId,
      destinatarios,
      cuerpo: texto,
    })
    setSending(false)
    if (!ok) {
      setError(err ?? "No se pudo enviar.")
      return
    }
    setCuerpo("")
    onOpenChange(false)
    onEnviado()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aviso a todos</DialogTitle>
          <DialogDescription>
            Envía el mismo mensaje a todo un grupo. Cada persona lo recibirá en
            su conversación.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="aviso_destinatarios">Destinatarios</Label>
            <Select
              value={destinatarios}
              onValueChange={(v) =>
                setDestinatarios(
                  v as "acomodadores" | "hermanas" | "capitanes" | "todos",
                )
              }
            >
              <SelectTrigger id="aviso_destinatarios">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acomodadores">
                  Acomodadores ({totales.acomodadores})
                </SelectItem>
                <SelectItem value="hermanas">
                  Hermanas de apoyo ({totales.hermanas})
                </SelectItem>
                <SelectItem value="capitanes">
                  Capitanes ({totales.capitanes})
                </SelectItem>
                <SelectItem value="todos">
                  Todo el personal ({totales.todos})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="aviso_cuerpo">Mensaje</Label>
            <textarea
              id="aviso_cuerpo"
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Escribe el aviso…"
              className="min-h-11 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={sending || !cuerpo.trim() || total === 0}
          >
            <SendIcon className="size-4" />
            {sending
              ? "Enviando…"
              : `Enviar a ${total} persona${total === 1 ? "" : "s"}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Directorio del personal con búsqueda para iniciar un mensaje directo. */
function DirectorioDialog({
  open,
  onOpenChange,
  personas,
  onSeleccionar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  personas: PersonaInfo[]
  onSeleccionar: (key: string) => void
}) {
  const [busqueda, setBusqueda] = React.useState("")

  function handleOpenChange(next: boolean) {
    if (!next) setBusqueda("")
    onOpenChange(next)
  }

  const visibles = React.useMemo(() => {
    return personas
      .filter((p) =>
        coincideBusqueda(
          busqueda,
          p.nombre,
          p.apellido,
          p.congregacion,
          p.telefono,
        ),
      )
      .sort((a, b) =>
        `${a.nombre} ${a.apellido}`.localeCompare(
          `${b.nombre} ${b.apellido}`,
          "es",
        ),
      )
  }, [personas, busqueda])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo mensaje</DialogTitle>
          <DialogDescription>
            Elige a quién enviarle un mensaje directo.
          </DialogDescription>
        </DialogHeader>
        <BuscadorPersonal value={busqueda} onChange={setBusqueda} />
        <div className="flex max-h-[50svh] flex-col gap-1 overflow-y-auto">
          {personas.length === 0 ? (
            <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Aún no hay personal registrado en esta asamblea.
            </p>
          ) : visibles.length === 0 ? (
            <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Nadie coincide con la búsqueda.
            </p>
          ) : (
            visibles.map((p) => (
              <button
                key={`${p.tipo}:${p.id}`}
                type="button"
                onClick={() => onSeleccionar(`${p.tipo}:${p.id}`)}
                className="rounded-xl border bg-surface p-3 text-left transition-colors hover:border-primary/50"
              >
                <span className="block truncate text-sm font-medium text-foreground">
                  {`${p.nombre} ${p.apellido}`.trim()}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {TIPO_LABEL[p.tipo]}
                  {p.congregacion && ` · ${p.congregacion}`}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
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
            {TIPO_LABEL[conversacion.tipo]}
            {conversacion.congregacion && ` · ${conversacion.congregacion}`}
          </p>
        </div>
      </div>

      <div className="flex max-h-[55svh] flex-1 flex-col gap-2 overflow-y-auto p-4">
        {conversacion.mensajes.length === 0 && (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            Aún no hay mensajes con {conversacion.nombre}. Escribe el primero
            para iniciar la conversación.
          </p>
        )}
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
          placeholder={
            conversacion.mensajes.length === 0
              ? "Escribe un mensaje…"
              : "Escribe tu respuesta…"
          }
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

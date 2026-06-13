"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MegaphoneIcon, MessageCircleQuestionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { crearAviso, type Audiencia } from "./actions"

const AUDIENCIAS: { value: Audiencia; label: string }[] = [
  { value: "acomodador", label: "Acomodadores" },
  { value: "capitan", label: "Capitanes" },
  { value: "hermana", label: "Hermanas de apoyo" },
]

export function AvisoForm() {
  const router = useRouter()
  const [tipo, setTipo] = React.useState<"aviso" | "pregunta">("aviso")
  const [titulo, setTitulo] = React.useState("")
  const [cuerpo, setCuerpo] = React.useState("")
  const [opcionA, setOpcionA] = React.useState("")
  const [opcionB, setOpcionB] = React.useState("")
  const [audiencias, setAudiencias] = React.useState<Audiencia[]>([])
  const [expira, setExpira] = React.useState("")
  const [enviando, setEnviando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState(false)

  function toggleAudiencia(value: Audiencia) {
    setAudiencias((prev) =>
      prev.includes(value)
        ? prev.filter((a) => a !== value)
        : [...prev, value],
    )
  }

  function limpiar() {
    setTitulo("")
    setCuerpo("")
    setOpcionA("")
    setOpcionB("")
    setAudiencias([])
    setExpira("")
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)
    setEnviando(true)
    // datetime-local viene en hora local; lo paso a ISO (UTC).
    const expiraAt = expira ? new Date(expira).toISOString() : null
    const r = await crearAviso({
      tipo,
      titulo,
      cuerpo,
      audiencias,
      opcionA,
      opcionB,
      expiraAt,
    })
    setEnviando(false)
    if (!r.ok) {
      setError(r.error ?? "No se pudo enviar.")
      return
    }
    setOk(true)
    limpiar()
    router.refresh()
    setTimeout(() => setOk(false), 3000)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      {/* Tipo */}
      <div className="flex gap-2">
        <TipoBtn
          activo={tipo === "aviso"}
          onClick={() => setTipo("aviso")}
          icon={<MegaphoneIcon className="size-4" />}
          label="Aviso"
        />
        <TipoBtn
          activo={tipo === "pregunta"}
          onClick={() => setTipo("pregunta")}
          icon={<MessageCircleQuestionIcon className="size-4" />}
          label="Pregunta"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="aviso-titulo">Título</Label>
        <Input
          id="aviso-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={200}
          placeholder={
            tipo === "pregunta"
              ? "¿Pueden quedarse al turno de la tarde?"
              : "Reunión de acomodadores a las 8:00"
          }
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="aviso-cuerpo">
          {tipo === "pregunta" ? "Detalle (opcional)" : "Mensaje (opcional)"}
        </Label>
        <textarea
          id="aviso-cuerpo"
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Escribe más detalles si hace falta…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
        />
      </div>

      {tipo === "pregunta" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aviso-opcion-a">Opción A</Label>
            <Input
              id="aviso-opcion-a"
              value={opcionA}
              onChange={(e) => setOpcionA(e.target.value)}
              maxLength={120}
              placeholder="Sí"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aviso-opcion-b">Opción B</Label>
            <Input
              id="aviso-opcion-b"
              value={opcionB}
              onChange={(e) => setOpcionB(e.target.value)}
              maxLength={120}
              placeholder="No"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Enviar a</Label>
        <div className="flex flex-wrap gap-2">
          {AUDIENCIAS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => toggleAudiencia(a.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                audiencias.includes(a.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:bg-muted",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="aviso-expira">Caduca (opcional)</Label>
        <Input
          id="aviso-expira"
          type="datetime-local"
          value={expira}
          onChange={(e) => setExpira(e.target.value)}
          className="w-full sm:w-64"
        />
        <p className="text-xs text-muted-foreground">
          Tras esta fecha el aviso deja de aparecer a quienes no lo hayan visto.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Aviso enviado.
        </p>
      )}

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar aviso"}
        </Button>
      </div>
    </form>
  )
}

function TipoBtn({
  activo,
  onClick,
  icon,
  label,
}: {
  activo: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        activo
          ? "border-primary bg-primary/10 text-primary"
          : "border-input text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CameraIcon, CheckIcon, UploadIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { compressImage } from "@/lib/compress-image"

import {
  reportarIncidenciaPersonal,
  type PersonalTipo,
} from "@/lib/actions/portal-personal"
import { TIPOS_INCIDENCIA } from "@/app/(app)/incidencias/catalogo"

export function IncidenciaForm({
  accessToken,
  tipoPersonal = "acomodador",
}: {
  accessToken: string
  tipoPersonal?: PersonalTipo
}) {
  const router = useRouter()
  const [tipo, setTipo] = React.useState("")
  const [ubicacion, setUbicacion] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const [foto, setFoto] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [procesandoFoto, setProcesandoFoto] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savedAt, setSavedAt] = React.useState<number | null>(null)

  async function onPickFoto(f: File | null) {
    if (!f) {
      setFoto(null)
      return
    }
    setProcesandoFoto(true)
    setError(null)
    try {
      const optimizada = await compressImage(f)
      setFoto(optimizada)
    } catch {
      setFoto(f)
    } finally {
      setProcesandoFoto(false)
    }
  }

  React.useEffect(() => {
    if (!foto) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(foto)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  React.useEffect(() => {
    if (savedAt === null) return
    const t = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(t)
  }, [savedAt])

  function pickSugerencia(t: string) {
    setTipo(t)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tipo.trim()) {
      setError("Selecciona o escribe el tipo de incidencia.")
      return
    }
    if (!foto) {
      setError("Toma o adjunta una foto.")
      return
    }
    const fd = new FormData()
    fd.set("personalTipo", tipoPersonal)
    fd.set("accessToken", accessToken)
    fd.set("tipo", tipo.trim())
    fd.set("ubicacion", ubicacion.trim())
    fd.set("descripcion", descripcion.trim())
    fd.set("foto", foto)

    setSubmitting(true)
    setError(null)
    try {
      const { ok, error: err } = await reportarIncidenciaPersonal(fd)
      setSubmitting(false)
      if (!ok) {
        setError(err)
        return
      }
    } catch (err) {
      setSubmitting(false)
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.toLowerCase().includes("body")
          ? "La foto es muy grande para enviarla. Prueba con una más ligera."
          : `No se pudo enviar el reporte: ${msg}`,
      )
      return
    }
    setTipo("")
    setUbicacion("")
    setDescripcion("")
    setFoto(null)
    setSavedAt(Date.now())
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="tipo" className="text-sm">
          ¿Qué pasó?
        </Label>
        <Input
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          list="acomodador-tipo-incidencia-options"
          placeholder="Médica, persona perdida, …"
          autoComplete="off"
          required
          className="h-12 text-base"
        />
        <datalist id="acomodador-tipo-incidencia-options">
          {TIPOS_INCIDENCIA.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {TIPOS_INCIDENCIA.slice(0, 8).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pickSugerencia(t)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                tipo === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="ubicacion" className="text-sm">
          Ubicación (opcional)
        </Label>
        <Input
          id="ubicacion"
          name="ubicacion"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          placeholder="Sala principal, fila 12, …"
          autoComplete="off"
          className="h-12 text-base"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="descripcion" className="text-sm">
          Detalle (opcional)
        </Label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          placeholder="Qué pasó, a quién, cómo se atendió, …"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-sm">Foto</Label>
        {preview ? (
          <div>
            <div className="relative overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="vista previa"
                className="max-h-72 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFoto(null)}
                aria-label="Quitar foto"
                className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            {foto && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Optimizada · {formatBytes(foto.size)}
              </p>
            )}
          </div>
        ) : procesandoFoto ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed bg-background text-xs text-muted-foreground">
            Optimizando foto…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-background text-muted-foreground transition-colors hover:bg-muted/40">
              <CameraIcon className="size-5" />
              <span className="text-xs">Tomar foto</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPickFoto(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-background text-muted-foreground transition-colors hover:bg-muted/40">
              <UploadIcon className="size-5" />
              <span className="text-xs">Galería</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFoto(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        size="lg"
        disabled={submitting || procesandoFoto}
        className="h-12 w-full text-base"
      >
        {submitting
          ? "Enviando…"
          : procesandoFoto
            ? "Procesando foto…"
            : "Enviar incidencia"}
      </Button>

      {savedAt !== null && (
        <p className="flex items-center justify-center gap-1 text-sm text-primary">
          <CheckIcon className="size-4" />
          Incidencia enviada
        </p>
      )}
    </form>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

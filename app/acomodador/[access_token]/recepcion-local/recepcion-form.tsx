"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CameraIcon, CheckIcon, UploadIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { compressImage } from "@/lib/compress-image"

import {
  RecepcionLocationFields,
  type AreaOption,
} from "@/components/recepcion-location-fields"

import {
  reportarRecepcionPersonal,
  type PersonalTipo,
} from "@/lib/actions/portal-personal"
import { DESPERFECTOS_RECEPCION } from "@/app/(app)/recepcion-local/catalogo"

export function RecepcionForm({
  accessToken,
  areas,
  tipoPersonal = "acomodador",
}: {
  accessToken: string
  areas: AreaOption[]
  tipoPersonal?: PersonalTipo
}) {
  const router = useRouter()
  const [desperfecto, setDesperfecto] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const [nivel, setNivel] = React.useState("")
  const [zona, setZona] = React.useState("")
  const [butaca, setButaca] = React.useState("")
  const [otroObjeto, setOtroObjeto] = React.useState("")
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

  function pickSugerencia(c: string) {
    setDesperfecto(c)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!desperfecto.trim()) {
      setError("Selecciona o escribe el desperfecto.")
      return
    }
    if (!foto) {
      setError("Toma o adjunta una foto.")
      return
    }
    const fd = new FormData()
    fd.set("personalTipo", tipoPersonal)
    fd.set("accessToken", accessToken)
    fd.set("desperfecto", desperfecto.trim())
    fd.set("descripcion", descripcion.trim())
    fd.set("nivel", nivel.trim())
    fd.set("zona", zona.trim())
    fd.set("butaca", butaca.trim())
    fd.set("otro_objeto", otroObjeto.trim())
    fd.set("foto", foto)

    setSubmitting(true)
    setError(null)
    try {
      const { ok, error: err } = await reportarRecepcionPersonal(fd)
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
    setDesperfecto("")
    setDescripcion("")
    setNivel("")
    setZona("")
    setButaca("")
    setOtroObjeto("")
    setFoto(null)
    setSavedAt(Date.now())
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-5">
      <RecepcionLocationFields
        areas={areas}
        nivel={nivel}
        zona={zona}
        butaca={butaca}
        otroObjeto={otroObjeto}
        onNivel={setNivel}
        onZona={setZona}
        onButaca={setButaca}
        onOtroObjeto={setOtroObjeto}
        size="lg"
      />

      <div className="grid gap-2">
        <Label htmlFor="desperfecto" className="text-sm">
          Desperfecto
        </Label>
        <Input
          id="desperfecto"
          name="desperfecto"
          value={desperfecto}
          onChange={(e) => setDesperfecto(e.target.value)}
          list="acomodador-desperfecto-options"
          placeholder="Silla rota, foco fundido, …"
          autoComplete="off"
          required
          className="h-12 text-base"
        />
        <datalist id="acomodador-desperfecto-options">
          {DESPERFECTOS_RECEPCION.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {DESPERFECTOS_RECEPCION.slice(0, 8).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickSugerencia(c)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                desperfecto === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
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
          placeholder="Dónde está, qué pasa, etc."
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
            : "Enviar reporte"}
      </Button>

      {savedAt !== null && (
        <p className="flex items-center justify-center gap-1 text-sm text-primary">
          <CheckIcon className="size-4" />
          Reporte enviado
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

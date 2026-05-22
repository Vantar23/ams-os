"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ImagePlusIcon,
  PlusIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapaImage } from "@/components/mapa-image"
import { compressImage } from "@/lib/compress-image"
import { createClient } from "@/lib/supabase/client"

import { agregarMapa, eliminarMapa } from "./actions"

export type Mapa = {
  id: string
  nombre: string
  descripcion: string
  url: string
  archivo: string
  size: number
}

export function MapaClient({
  asambleaId,
  mapas,
}: {
  asambleaId: string
  mapas: Mapa[]
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 lg:px-10">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Lugar
        </p>
        <h1 className="mt-2 font-serif text-3xl text-foreground">
          Mapas de la sede
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Sube los planos del recinto: planta baja, estacionamiento, áreas
          exteriores, etc. Quedan disponibles para acomodadores y capitanes.
        </p>
      </header>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {mapas.length === 0
              ? "Sin mapas"
              : `${mapas.length} mapa${mapas.length === 1 ? "" : "s"}`}
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon />
                Agregar mapa
              </Button>
            </DialogTrigger>
            <UploadMapaDialog
              open={open}
              onOpenChange={setOpen}
              asambleaId={asambleaId}
            />
          </Dialog>
        </div>

        {mapas.length === 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 flex w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-surface px-6 py-16 text-center transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <UploadCloudIcon className="size-8 text-muted-foreground" />
            <div>
              <p className="font-serif text-lg text-foreground">
                Sin mapas todavía
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Haz clic para subir el primer plano del recinto.
              </p>
            </div>
          </button>
        ) : (
          <ul className="mt-6 grid gap-10">
            {mapas.map((m) => (
              <MapaItem key={m.id} mapa={m} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function MapaItem({ mapa }: { mapa: Mapa }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error: err } = await eliminarMapa(mapa.id)
    setDeleting(false)
    if (err) {
      setError(err)
      return
    }
    setDeleteOpen(false)
    router.refresh()
  }

  return (
    <li>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-xl text-foreground">
            {mapa.nombre}
          </h2>
          {mapa.descripcion && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mapa.descripcion}
            </p>
          )}
          <p className="mt-1 truncate text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {mapa.archivo} · {formatSize(mapa.size)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setDeleteOpen(true)}
          aria-label={`Eliminar ${mapa.nombre}`}
        >
          <Trash2Icon />
        </Button>
      </div>
      <div className="mt-3">
        <MapaImage url={mapa.url} alt={mapa.nombre} />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar el mapa {mapa.nombre}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

function UploadMapaDialog({
  open,
  onOpenChange,
  asambleaId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  asambleaId: string
}) {
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState("")
  const [nombre, setNombre] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [procesando, setProcesando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFile(null)
      setPreviewUrl("")
      setNombre("")
      setDescripcion("")
      setError(null)
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function pickFile(f: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!nombre) setNombre(f.name.replace(/\.[^.]+$/, ""))
    setProcesando(true)
    setError(null)
    try {
      // Mapas se hacen zoom — mantenemos mejor resolución y calidad.
      const optimizado = await compressImage(f, {
        maxDimension: 3000,
        quality: 0.9,
      })
      setFile(optimizado)
      setPreviewUrl(URL.createObjectURL(optimizado))
    } catch {
      setFile(f)
      setPreviewUrl(URL.createObjectURL(f))
    } finally {
      setProcesando(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !nombre.trim()) return
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const ext = file.name.includes(".")
      ? file.name.split(".").pop()!.toLowerCase()
      : "png"
    const path = `${asambleaId}/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from("mapas")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
    if (upErr) {
      setSubmitting(false)
      setError(upErr.message)
      return
    }

    const { error: dbErr } = await agregarMapa(asambleaId, {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      storagePath: path,
      archivo: file.name,
      size: file.size,
      mimeType: file.type,
    })
    if (dbErr) {
      await supabase.storage.from("mapas").remove([path])
      setSubmitting(false)
      setError(dbErr)
      return
    }

    setSubmitting(false)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Agregar mapa</DialogTitle>
        <DialogDescription>
          Sube una imagen del plano (PNG, JPG o WebP).
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label
            htmlFor="archivo"
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          >
            Archivo
          </Label>
          {previewUrl ? (
            <label
              htmlFor="archivo"
              className="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-md border border-border bg-background transition-colors hover:bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Vista previa"
                className="absolute inset-0 size-full object-contain"
              />
            </label>
          ) : (
            <label
              htmlFor="archivo"
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface text-center transition-colors hover:bg-background"
            >
              <ImagePlusIcon className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Selecciona una imagen
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP</p>
            </label>
          )}
          <input
            id="archivo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void pickFile(f)
            }}
          />
          {procesando && (
            <p className="text-xs text-muted-foreground">Optimizando imagen…</p>
          )}
          {file && (
            <p className="truncate text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {file.name} · {formatSize(file.size)}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="nombre"
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          >
            Nombre
          </Label>
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Planta baja"
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="descripcion"
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          >
            Descripción
          </Label>
          <Input
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="submit"
            disabled={!file || !nombre.trim() || submitting || procesando}
          >
            {submitting
              ? "Subiendo…"
              : procesando
                ? "Optimizando…"
                : "Guardar mapa"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

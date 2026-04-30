"use client"

import * as React from "react"
import {
  ImagePlusIcon,
  PlusIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
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
import { uid } from "@/lib/uid"

type Mapa = {
  id: string
  nombre: string
  descripcion: string
  url: string
  archivo: string
  size: number
}

export default function MapaPage() {
  const [mapas, setMapas] = React.useState<Mapa[]>([])
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    return () => {
      mapas.forEach((m) => URL.revokeObjectURL(m.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addMapa(m: Mapa) {
    setMapas((prev) => [...prev, m])
    setOpen(false)
  }

  function removeMapa(id: string) {
    setMapas((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  return (
    <>
      <PageHeader parent="Lugar" title="Mapa" />
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
              <UploadMapaDialog open={open} onAdd={addMapa} />
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
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mapas.map((m) => (
                <li
                  key={m.id}
                  className="overflow-hidden rounded-md border border-border bg-surface"
                >
                  <div className="relative aspect-[4/3] bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.nombre}
                      className="absolute inset-0 size-full object-contain"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-border p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {m.nombre}
                      </p>
                      {m.descripcion && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {m.descripcion}
                        </p>
                      )}
                      <p className="mt-2 truncate text-xs uppercase tracking-[0.15em] text-muted-foreground">
                        {m.archivo} · {formatSize(m.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeMapa(m.id)}
                      aria-label={`Eliminar ${m.nombre}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function UploadMapaDialog({
  open,
  onAdd,
}: {
  open: boolean
  onAdd: (m: Mapa) => void
}) {
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState("")
  const [nombre, setNombre] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")

  React.useEffect(() => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFile(null)
      setPreviewUrl("")
      setNombre("")
      setDescripcion("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function pickFile(f: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    if (!nombre) setNombre(f.name.replace(/\.[^.]+$/, ""))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !previewUrl || !nombre.trim()) return
    onAdd({
      id: uid(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      url: previewUrl,
      archivo: file.name,
      size: file.size,
    })
    // ownership transferred — clear local refs so cleanup effect doesn't revoke
    setPreviewUrl("")
    setFile(null)
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
              if (f) pickFile(f)
            }}
          />
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

        <DialogFooter>
          <Button type="submit" disabled={!file || !nombre.trim()}>
            Guardar mapa
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

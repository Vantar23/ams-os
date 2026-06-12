"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ImageIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { compressImage } from "@/lib/compress-image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

import { PrimerosAuxiliosButton } from "@/components/primeros-auxilios-button"
import { WhatsappIcon } from "@/components/whatsapp-icon"
import { normalizePhone } from "@/lib/phone"

import {
  TIPOS_INCIDENCIA,
  ESTADO_LABEL,
  type EstadoIncidencia,
} from "./catalogo"
import {
  actualizarEstadoIncidencia,
  agregarIncidencia,
  eliminarIncidencia,
} from "./actions"

export type IncidenciaItem = {
  id: string
  tipo: string
  ubicacion: string | null
  descripcion: string | null
  estado: EstadoIncidencia
  created_at: string
  foto_url: string | null
  reporter_label: string
}

type Asamblea = { id: string; numero: string; edicion: string }

export function IncidenciasClient({
  asamblea,
  items,
  primerosAuxilios,
}: {
  asamblea: Asamblea
  items: IncidenciaItem[]
  primerosAuxilios: string | null
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [filtro, setFiltro] = React.useState<EstadoIncidencia | "todos">(
    "todos",
  )

  const visibles = items.filter(
    (i) => filtro === "todos" || i.estado === filtro,
  )
  const pendientes = items.filter((i) => i.estado === "pendiente").length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Incidencias</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} reporte{items.length === 1 ? "" : "s"}
            {pendientes > 0 && (
              <>
                {" · "}
                <span className="text-amber-700 dark:text-amber-400">
                  {pendientes} pendiente{pendientes === 1 ? "" : "s"}
                </span>
              </>
            )}{" "}
            ·{" "}
            <span>
              Asamblea N° {asamblea.numero} — {asamblea.edicion}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PrimerosAuxiliosButton telefono={primerosAuxilios} />
          <Select
            value={filtro}
            onValueChange={(v) => setFiltro(v as EstadoIncidencia | "todos")}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="resuelto">Resueltos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="w-full sm:w-auto"
          >
            <PlusIcon />
            Reportar
          </Button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "Aún no hay incidencias. Las que reporten tus acomodadores aparecerán aquí."
            : "Ninguna incidencia coincide con este filtro."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((item) => (
            <IncidenciaCard
              key={item.id}
              item={item}
              primerosAuxilios={primerosAuxilios}
            />
          ))}
        </ul>
      )}

      <AddIncidenciaDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function IncidenciaCard({
  item,
  primerosAuxilios,
}: {
  item: IncidenciaItem
  primerosAuxilios: string | null
}) {
  const router = useRouter()
  const [updating, setUpdating] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [imageOpen, setImageOpen] = React.useState(false)

  // Abre WhatsApp con la incidencia escrita: directo a primeros auxilios si
  // la asamblea tiene su número configurado (Ajustes), o con el selector de
  // contactos de WhatsApp si no.
  const paDigits = primerosAuxilios ? normalizePhone(primerosAuxilios) : ""
  const waTexto = encodeURIComponent(
    [
      `🚨 Incidencia: ${item.tipo}`,
      item.ubicacion && `Ubicación: ${item.ubicacion}`,
      item.descripcion,
      `Reportado por ${item.reporter_label} · ${formatDate(item.created_at)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  )
  const waUrl = paDigits
    ? `https://wa.me/52${paDigits}?text=${waTexto}`
    : `https://wa.me/?text=${waTexto}`

  async function changeEstado(estado: EstadoIncidencia) {
    setUpdating(true)
    const { error } = await actualizarEstadoIncidencia(item.id, estado)
    setUpdating(false)
    if (error) {
      alert(error)
      return
    }
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await eliminarIncidencia(item.id)
    setDeleting(false)
    if (error) {
      alert(error)
      return
    }
    setDeleteOpen(false)
    router.refresh()
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border bg-surface">
      <button
        type="button"
        onClick={() => item.foto_url && setImageOpen(true)}
        disabled={!item.foto_url}
        className="relative flex aspect-video w-full items-center justify-center bg-muted disabled:cursor-default"
      >
        {item.foto_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.foto_url}
            alt={item.tipo}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" />
        )}
        <EstadoChip estado={item.estado} className="absolute right-2 top-2" />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-medium text-foreground">{item.tipo}</h3>
        {item.ubicacion && (
          <p className="text-sm font-medium text-foreground">
            {item.ubicacion}
          </p>
        )}
        {item.descripcion && (
          <p className="text-sm text-muted-foreground">{item.descripcion}</p>
        )}
        <p className="mt-auto text-xs text-muted-foreground">
          {formatDate(item.created_at)} · {item.reporter_label}
        </p>

        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-600/15 dark:text-emerald-400"
        >
          <WhatsappIcon className="size-3.5" />
          Enviar a Primeros auxilios
        </a>

        <div className="mt-3 flex items-center gap-2">
          <Select
            value={item.estado}
            onValueChange={(v) => changeEstado(v as EstadoIncidencia)}
            disabled={updating}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="resuelto">Resuelto</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDeleteOpen(true)}
            aria-label="Eliminar"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta incidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si hay foto, también se
              eliminará.
            </AlertDialogDescription>
          </AlertDialogHeader>
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

      {item.foto_url && (
        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{item.tipo}</DialogTitle>
            </DialogHeader>
            <button
              type="button"
              onClick={() => setImageOpen(false)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur hover:bg-background"
            >
              <XIcon className="size-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.foto_url}
              alt={item.tipo}
              className="max-h-[85vh] w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </li>
  )
}

function EstadoChip({
  estado,
  className,
}: {
  estado: EstadoIncidencia
  className?: string
}) {
  const styles: Record<EstadoIncidencia, string> = {
    pendiente: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    en_proceso: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
    resuelto: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[estado]} ${className ?? ""}`}
    >
      {ESTADO_LABEL[estado]}
    </span>
  )
}

function AddIncidenciaDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [tipo, setTipo] = React.useState("")
  const [ubicacion, setUbicacion] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const [foto, setFoto] = React.useState<File | null>(null)
  const [procesandoFoto, setProcesandoFoto] = React.useState(false)

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

  function handleOpenChange(v: boolean) {
    if (!v) {
      setTipo("")
      setUbicacion("")
      setDescripcion("")
      setFoto(null)
      setError(null)
    }
    onOpenChange(v)
  }

  const preview = React.useMemo(
    () => (foto ? URL.createObjectURL(foto) : null),
    [foto],
  )
  React.useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tipo.trim()) {
      setError("Selecciona o escribe un tipo.")
      return
    }
    if (!foto) {
      setError("Adjunta una foto de la incidencia.")
      return
    }
    const fd = new FormData()
    fd.set("tipo", tipo.trim())
    fd.set("ubicacion", ubicacion.trim())
    fd.set("descripcion", descripcion.trim())
    fd.set("foto", foto)

    setSubmitting(true)
    setError(null)
    const { error: err } = await agregarIncidencia(fd)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    router.refresh()
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva incidencia</DialogTitle>
          <DialogDescription>
            Anota lo que pasó. Adjunta una foto y, si aplica, la ubicación.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Input
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              list="tipo-incidencia-options"
              placeholder="Médica, persona perdida, …"
              autoComplete="off"
              required
            />
            <datalist id="tipo-incidencia-options">
              {TIPOS_INCIDENCIA.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ubicacion">Ubicación (opcional)</Label>
            <Input
              id="ubicacion"
              name="ubicacion"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Sala principal, fila 12"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Detalles relevantes para el capitán."
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Foto</Label>
            {preview ? (
              <div>
                <div className="relative overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt=""
                    className="max-h-64 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFoto(null)}
                    className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur"
                    aria-label="Quitar foto"
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
              <div className="flex items-center justify-center rounded-lg border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground">
                Optimizando foto…
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted/40">
                <UploadIcon className="size-4" />
                Subir foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPickFoto(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting || procesandoFoto}
              className="w-full sm:w-auto"
            >
              {submitting
                ? "Guardando…"
                : procesandoFoto
                  ? "Procesando foto…"
                  : "Guardar incidencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
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

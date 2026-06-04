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

import {
  RecepcionLocationFields,
  type AreaOption,
} from "@/components/recepcion-location-fields"

import {
  DESPERFECTOS_RECEPCION,
  ESTADO_LABEL,
  type EstadoRecepcion,
} from "./catalogo"
import {
  actualizarEstadoRecepcion,
  agregarRecepcionItem,
  eliminarRecepcionItem,
} from "./actions"

export type RecepcionItem = {
  id: string
  desperfecto: string
  descripcion: string | null
  nivel: string | null
  zona: string | null
  butaca: string | null
  otro_objeto: string | null
  estado: EstadoRecepcion
  created_at: string
  foto_url: string | null
  reporter_label: string
}

type Asamblea = { id: string; numero: string; edicion: string }

export function RecepcionClient({
  asamblea,
  items,
  areas,
}: {
  asamblea: Asamblea
  items: RecepcionItem[]
  areas: AreaOption[]
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [filtro, setFiltro] = React.useState<EstadoRecepcion | "todos">("todos")

  const visibles = items.filter((i) => filtro === "todos" || i.estado === filtro)
  const pendientes = items.filter((i) => i.estado === "pendiente").length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recepción del local</h2>
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
            · <span>Asamblea N° {asamblea.numero} — {asamblea.edicion}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={filtro}
            onValueChange={(v) => setFiltro(v as EstadoRecepcion | "todos")}
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
            Agregar
          </Button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "Aún no hay reportes. Agrega el primero cuando recibas el local."
            : "Ningún reporte coincide con este filtro."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((item) => (
            <RecepcionCard key={item.id} item={item} />
          ))}
        </ul>
      )}

      <AddRecepcionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        areas={areas}
      />
    </div>
  )
}

function RecepcionCard({ item }: { item: RecepcionItem }) {
  const router = useRouter()
  const [updating, setUpdating] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [imageOpen, setImageOpen] = React.useState(false)

  async function changeEstado(estado: EstadoRecepcion) {
    setUpdating(true)
    const { error } = await actualizarEstadoRecepcion(item.id, estado)
    setUpdating(false)
    if (error) {
      alert(error)
      return
    }
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await eliminarRecepcionItem(item.id)
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
            alt={item.desperfecto}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" />
        )}
        <EstadoChip
          estado={item.estado}
          className="absolute right-2 top-2"
        />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-medium text-foreground">
          {item.desperfecto}
        </h3>
        <Ubicacion item={item} />
        {item.descripcion && (
          <p className="text-sm text-muted-foreground">{item.descripcion}</p>
        )}
        <p className="mt-auto text-xs text-muted-foreground">
          {formatDate(item.created_at)} · {item.reporter_label}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Select
            value={item.estado}
            onValueChange={(v) => changeEstado(v as EstadoRecepcion)}
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
            <AlertDialogTitle>¿Eliminar este reporte?</AlertDialogTitle>
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
              <DialogTitle>{item.desperfecto}</DialogTitle>
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
              alt={item.desperfecto}
              className="max-h-[85vh] w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </li>
  )
}

function Ubicacion({ item }: { item: RecepcionItem }) {
  const partes = [
    item.nivel,
    item.zona,
    item.butaca ? `Butaca ${item.butaca}` : null,
    item.otro_objeto,
  ].filter(Boolean) as string[]
  if (partes.length === 0) return null
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {partes.map((p, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5"
        >
          {p}
        </span>
      ))}
    </p>
  )
}

function EstadoChip({
  estado,
  className,
}: {
  estado: EstadoRecepcion
  className?: string
}) {
  const styles: Record<EstadoRecepcion, string> = {
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

function AddRecepcionDialog({
  open,
  onOpenChange,
  areas,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  areas: AreaOption[]
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [desperfecto, setDesperfecto] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const [nivel, setNivel] = React.useState("")
  const [zona, setZona] = React.useState("")
  const [butaca, setButaca] = React.useState("")
  const [otroObjeto, setOtroObjeto] = React.useState("")
  const [foto, setFoto] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
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

  React.useEffect(() => {
    if (!open) {
      setDesperfecto("")
      setDescripcion("")
      setNivel("")
      setZona("")
      setButaca("")
      setOtroObjeto("")
      setFoto(null)
      setPreview(null)
      setError(null)
    }
  }, [open])

  React.useEffect(() => {
    if (!foto) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(foto)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!desperfecto.trim()) {
      setError("Selecciona o escribe el desperfecto.")
      return
    }
    if (!foto) {
      setError("Adjunta una foto del problema.")
      return
    }
    const fd = new FormData()
    fd.set("desperfecto", desperfecto.trim())
    fd.set("descripcion", descripcion.trim())
    fd.set("nivel", nivel.trim())
    fd.set("zona", zona.trim())
    fd.set("butaca", butaca.trim())
    fd.set("otro_objeto", otroObjeto.trim())
    fd.set("foto", foto)

    setSubmitting(true)
    setError(null)
    const { error: err } = await agregarRecepcionItem(fd)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    router.refresh()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo reporte</DialogTitle>
          <DialogDescription>
            Anota lo que encontraste al recibir el local. Puedes adjuntar una
            foto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
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
          />

          <div className="grid gap-1.5">
            <Label htmlFor="desperfecto">Desperfecto</Label>
            <Input
              id="desperfecto"
              name="desperfecto"
              value={desperfecto}
              onChange={(e) => setDesperfecto(e.target.value)}
              list="desperfecto-options"
              placeholder="Silla rota, foco fundido, …"
              autoComplete="off"
              required
            />
            <datalist id="desperfecto-options">
              {DESPERFECTOS_RECEPCION.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Detalles del problema, ubicación, etc."
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Foto</Label>
            {preview ? (
              <div>
                <div className="relative overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="max-h-64 w-full object-cover" />
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
                  : "Guardar reporte"}
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

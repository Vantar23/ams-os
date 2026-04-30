"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { uid } from "@/lib/uid"
import { cn } from "@/lib/utils"

const TIPOS = [
  "Médica",
  "Persona perdida",
  "Niño extraviado",
  "Bloqueo de paso",
  "Estacionamiento",
  "Limpieza o derrame",
  "Acceso o entrada",
  "Ruido o interrupción",
  "Otro",
] as const
type Tipo = (typeof TIPOS)[number]

type Incidencia = {
  id: string
  tipo: Tipo
  ubicacion: string
  descripcion: string
  fotoUrl: string
  reportado: number
}

export default function IncidenciasPage() {
  const [items, setItems] = React.useState<Incidencia[]>([])
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.fotoUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function add(i: Incidencia) {
    setItems((prev) => [i, ...prev])
    setOpen(false)
  }

  function remove(id: string) {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.fotoUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  return (
    <>
      <PageHeader parent="Reportes" title="Incidencias" />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 lg:px-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Reportes
            </p>
            <h1 className="mt-2 font-serif text-3xl text-foreground">
              Incidencias
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Selecciona el tipo, toma una foto y describe el incidente. Los
              capitanes lo reciben en su tablero.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusIcon />
                Reportar incidencia
              </Button>
            </DialogTrigger>
            <ReportWizard open={open} onSubmit={add} />
          </Dialog>
        </header>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Historial
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            {items.length === 0
              ? "Sin reportes"
              : `${items.length} reporte${items.length === 1 ? "" : "s"}`}
          </h2>

          {items.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Las incidencias reportadas aparecerán aquí.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="overflow-hidden rounded-md border border-border bg-surface"
                >
                  <div className="relative aspect-[4/3] bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.fotoUrl}
                      alt={it.tipo}
                      className="absolute inset-0 size-full object-cover"
                    />
                  </div>
                  <div className="border-t border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                          {it.tipo}
                        </span>
                        {it.ubicacion && (
                          <p className="mt-2 truncate text-sm font-medium text-foreground">
                            {it.ubicacion}
                          </p>
                        )}
                        {it.descripcion && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {it.descripcion}
                          </p>
                        )}
                        <p className="mt-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                          Hace{" "}
                          {formatDistanceToNow(it.reportado, { locale: es })}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(it.id)}
                        aria-label={`Eliminar reporte de ${it.tipo}`}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
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

const STEPS = ["Tipo", "Foto", "Detalles"] as const
type StepIndex = 0 | 1 | 2

function ReportWizard({
  open,
  onSubmit,
}: {
  open: boolean
  onSubmit: (i: Incidencia) => void
}) {
  const [step, setStep] = React.useState<StepIndex>(0)
  const [tipo, setTipo] = React.useState<Tipo | "">("")
  const [foto, setFoto] = React.useState<File | null>(null)
  const [fotoUrl, setFotoUrl] = React.useState("")
  const [ubicacion, setUbicacion] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) {
      if (fotoUrl) URL.revokeObjectURL(fotoUrl)
      setStep(0)
      setTipo("")
      setFoto(null)
      setFotoUrl("")
      setUbicacion("")
      setDescripcion("")
      if (fileRef.current) fileRef.current.value = ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function takePhoto(f: File) {
    if (fotoUrl) URL.revokeObjectURL(fotoUrl)
    setFoto(f)
    setFotoUrl(URL.createObjectURL(f))
  }

  function clearPhoto() {
    if (fotoUrl) URL.revokeObjectURL(fotoUrl)
    setFoto(null)
    setFotoUrl("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const canAdvance =
    (step === 0 && !!tipo) ||
    (step === 1 && !!foto && !!fotoUrl) ||
    step === 2

  function next() {
    if (!canAdvance) return
    if (step === 2) {
      if (!tipo || !foto || !fotoUrl) return
      onSubmit({
        id: uid(),
        tipo,
        ubicacion: ubicacion.trim(),
        descripcion: descripcion.trim(),
        fotoUrl,
        reportado: Date.now(),
      })
      setFotoUrl("")
      setFoto(null)
      return
    }
    setStep((s) => ((s + 1) as StepIndex))
  }

  function back() {
    setStep((s) => (Math.max(0, s - 1) as StepIndex))
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Reportar incidencia</DialogTitle>
        <DialogDescription>
          Paso {step + 1} de {STEPS.length} · {STEPS[step]}
        </DialogDescription>
      </DialogHeader>

      <ol className="flex items-center gap-2" aria-label="Progreso">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                i < step
                  ? "border-primary bg-primary text-primary-foreground"
                  : i === step
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground"
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <CheckIcon className="size-3" /> : i + 1}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  i < step ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        ))}
      </ol>

      <div className="grid gap-4">
        {step === 0 && (
          <div className="grid gap-1.5">
            <Label
              htmlFor="tipo"
              className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              Tipo de incidencia
            </Label>
            <Select
              value={tipo || undefined}
              onValueChange={(v) => setTipo(v as Tipo)}
            >
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Elige la categoría que mejor describe el incidente.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-1.5">
            <Label
              htmlFor="foto"
              className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              Foto
            </Label>
            {fotoUrl ? (
              <div className="overflow-hidden rounded-md border border-border bg-background">
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoUrl}
                    alt="Foto de la incidencia"
                    className="absolute inset-0 size-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
                  <p className="truncate text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {foto?.name}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <RefreshCwIcon />
                      Cambiar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={clearPhoto}
                      aria-label="Quitar foto"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                htmlFor="foto"
                className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background text-center transition-colors hover:bg-surface"
              >
                <CameraIcon className="size-8 text-muted-foreground" />
                <p className="font-serif text-lg text-foreground">
                  Tomar foto
                </p>
                <p className="text-xs text-muted-foreground">
                  Cámara o carrete del dispositivo.
                </p>
              </label>
            )}
            <input
              id="foto"
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) takePhoto(f)
              }}
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label
                htmlFor="ubicacion"
                className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
              >
                Ubicación
              </Label>
              <Input
                id="ubicacion"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Sala principal, fila 12"
              />
            </div>
            <div className="grid gap-1.5">
              <Label
                htmlFor="descripcion"
                className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
              >
                Descripción
              </Label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Detalles relevantes para el capitán de área."
                className="w-full min-w-0 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <p className="text-xs text-muted-foreground">
                Ambos campos son opcionales.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={step === 0}
        >
          <ArrowLeftIcon />
          Atrás
        </Button>
        <Button type="button" onClick={next} disabled={!canAdvance}>
          {step === 2 ? (
            <>
              <CheckIcon />
              Enviar
            </>
          ) : (
            <>
              Siguiente
              <ArrowRightIcon />
            </>
          )}
        </Button>
      </div>
    </DialogContent>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  PencilIcon,
  Trash2Icon,
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLocalStorage } from "@/lib/use-local-storage"
import { uid } from "@/lib/uid"

type Area = {
  id: string
  nombre: string
  ubicacion?: string
  capacidad?: string
  notas?: string
}

type Sesion = "manana" | "tarde"

type Conteo = {
  id: string
  areaId: string
  areaNombre: string
  vacios: number
  dia: string
  sesion: Sesion
  timestamp: string
}

const DIAS = [
  { value: "2026-10-02", label: "Vie 2 oct" },
  { value: "2026-10-03", label: "Sáb 3 oct" },
  { value: "2026-10-04", label: "Dom 4 oct" },
] as const

const SESION_LABEL: Record<Sesion, string> = {
  manana: "Mañana",
  tarde: "Tarde",
}

function defaultDia(): string {
  const today = new Date().toISOString().slice(0, 10)
  return DIAS.find((d) => d.value === today)?.value ?? DIAS[0].value
}

function defaultSesion(): Sesion {
  return new Date().getHours() < 14 ? "manana" : "tarde"
}

export default function AsistenciaPage() {
  const [areas] = useLocalStorage<Area[]>("ams-os.areas", [])
  const [conteos, setConteos] = useLocalStorage<Conteo[]>(
    "ams-os.asistencia",
    [],
  )

  const [step, setStep] = React.useState<"area" | "vacios">("area")
  const [selected, setSelected] = React.useState<Area | null>(null)
  const [vacios, setVacios] = React.useState("")
  const [dia, setDia] = React.useState<string>(() => defaultDia())
  const [sesion, setSesion] = React.useState<Sesion>(() => defaultSesion())
  const [savedAt, setSavedAt] = React.useState<number | null>(null)

  const [editing, setEditing] = React.useState<Conteo | null>(null)

  function pickArea(area: Area) {
    setSelected(area)
    setStep("vacios")
    setVacios("")
    setDia(defaultDia())
    setSesion(defaultSesion())
  }

  function reset() {
    setSelected(null)
    setStep("area")
    setVacios("")
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const n = Number.parseInt(vacios, 10)
    if (Number.isNaN(n) || n < 0) return
    const conteo: Conteo = {
      id: uid(),
      areaId: selected.id,
      areaNombre: selected.nombre,
      vacios: n,
      dia,
      sesion,
      timestamp: new Date().toISOString(),
    }
    setConteos((prev) => [conteo, ...prev])
    setSavedAt(Date.now())
    reset()
  }

  React.useEffect(() => {
    if (savedAt === null) return
    const t = setTimeout(() => setSavedAt(null), 2000)
    return () => clearTimeout(t)
  }, [savedAt])

  function applyEdit(updated: Conteo) {
    setConteos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setEditing(null)
  }

  function deleteConteo(id: string) {
    setConteos((prev) => prev.filter((c) => c.id !== id))
    setEditing(null)
  }

  return (
    <>
      <PageHeader parent="Reportes" title="Asistencia" />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          {step === "area" ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Paso 1 de 2
              </p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">
                Selecciona un área
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Toca el área donde estás contando los lugares vacíos.
              </p>

              {areas.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-border bg-background p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay áreas registradas todavía.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    <Link href="/areas">Crear áreas</Link>
                  </Button>
                </div>
              ) : (
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {areas.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => pickArea(a)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {a.nombre}
                          </p>
                          {a.ubicacion && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.ubicacion}
                            </p>
                          )}
                        </div>
                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <form onSubmit={save}>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeftIcon className="size-3.5" />
                Cambiar área
              </button>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Paso 2 de 2 · Área
              </p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">
                {selected?.nombre}
              </h2>
              {selected?.ubicacion && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.ubicacion}
                </p>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dia"
                    className="block text-sm font-medium text-foreground"
                  >
                    Día
                  </label>
                  <Select value={dia} onValueChange={setDia}>
                    <SelectTrigger id="dia" className="mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="block text-sm font-medium text-foreground">
                    Sesión
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(Object.keys(SESION_LABEL) as Sesion[]).map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={sesion === s ? "default" : "outline"}
                        onClick={() => setSesion(s)}
                      >
                        {SESION_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <label
                htmlFor="vacios"
                className="mt-6 block text-sm font-medium text-foreground"
              >
                Lugares vacíos
              </label>
              <Input
                id="vacios"
                type="number"
                inputMode="numeric"
                min={0}
                value={vacios}
                onChange={(e) => setVacios(e.target.value)}
                placeholder="0"
                autoFocus
                required
                className="mt-2 h-14 text-2xl tabular-nums"
              />

              <Button
                type="submit"
                size="lg"
                className="mt-6 w-full"
                disabled={vacios === ""}
              >
                Guardar conteo
              </Button>
            </form>
          )}
        </section>

        {savedAt !== null && (
          <p className="flex items-center justify-center gap-2 text-sm text-primary">
            <CheckIcon className="size-4" /> Conteo guardado
          </p>
        )}

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimos conteos</h2>
            <p className="text-sm text-muted-foreground">
              {conteos.length} registro{conteos.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Sesión</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Vacíos</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Editar</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conteos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Sin conteos. Registra el primero para comenzar.
                    </TableCell>
                  </TableRow>
                ) : (
                  conteos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDia(c.dia)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.sesion ? SESION_LABEL[c.sesion] : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.areaNombre}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {c.vacios}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditing(c)}
                          aria-label="Editar conteo"
                        >
                          <PencilIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <EditConteoDialog
        conteo={editing}
        areas={areas}
        onClose={() => setEditing(null)}
        onSave={applyEdit}
        onDelete={deleteConteo}
      />
    </>
  )
}

function EditConteoDialog({
  conteo,
  areas,
  onClose,
  onSave,
  onDelete,
}: {
  conteo: Conteo | null
  areas: Area[]
  onClose: () => void
  onSave: (c: Conteo) => void
  onDelete: (id: string) => void
}) {
  const [areaId, setAreaId] = React.useState("")
  const [dia, setDia] = React.useState<string>(DIAS[0].value)
  const [sesion, setSesion] = React.useState<Sesion>("manana")
  const [vacios, setVacios] = React.useState("")

  React.useEffect(() => {
    if (!conteo) return
    setAreaId(conteo.areaId)
    setDia(conteo.dia ?? DIAS[0].value)
    setSesion(conteo.sesion ?? "manana")
    setVacios(String(conteo.vacios))
  }, [conteo])

  const open = conteo !== null

  // include the original area even if it's been deleted, so the select stays valid
  const options = React.useMemo(() => {
    if (!conteo) return areas
    if (areas.some((a) => a.id === conteo.areaId)) return areas
    return [
      ...areas,
      {
        id: conteo.areaId,
        nombre: `${conteo.areaNombre} (eliminada)`,
      } as Area,
    ]
  }, [areas, conteo])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!conteo) return
    const n = Number.parseInt(vacios, 10)
    if (Number.isNaN(n) || n < 0) return
    const area = options.find((a) => a.id === areaId)
    onSave({
      ...conteo,
      areaId,
      areaNombre: area?.nombre.replace(" (eliminada)", "") ?? conteo.areaNombre,
      dia,
      sesion,
      vacios: n,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar conteo</DialogTitle>
          <DialogDescription>
            Cambia el área, día, sesión o número de lugares vacíos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label
              htmlFor="edit-area"
              className="block text-sm font-medium text-foreground"
            >
              Área
            </label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger id="edit-area" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-dia"
                className="block text-sm font-medium text-foreground"
              >
                Día
              </label>
              <Select value={dia} onValueChange={setDia}>
                <SelectTrigger id="edit-dia" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="block text-sm font-medium text-foreground">
                Sesión
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(SESION_LABEL) as Sesion[]).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={sesion === s ? "default" : "outline"}
                    onClick={() => setSesion(s)}
                  >
                    {SESION_LABEL[s]}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-vacios"
              className="block text-sm font-medium text-foreground"
            >
              Lugares vacíos
            </label>
            <Input
              id="edit-vacios"
              type="number"
              inputMode="numeric"
              min={0}
              value={vacios}
              onChange={(e) => setVacios(e.target.value)}
              required
              className="mt-2 tabular-nums"
            />
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => conteo && onDelete(conteo.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon />
              Eliminar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatDia(iso: string | undefined): string {
  if (!iso) return "—"
  const known = DIAS.find((d) => d.value === iso)
  if (known) return known.label
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  } catch {
    return iso
  }
}

"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  HistoryIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  TableIcon,
  Trash2Icon,
  Undo2Icon,
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
import { reportarConteoCapitan } from "@/app/capitan/asistencia/actions"
import {
  DIAS,
  DIA_A_SLOT,
  SESION_LABEL,
  SLOT_DIA,
  asistenciaFromConteo,
  computeResumenRows,
  formatDia,
  formatTimestamp,
  modoDeArea,
  reporteToConteo,
  type Area,
  type Conteo,
  type Reporte,
  type Sesion,
} from "@/lib/asistencia"
import { useLocalStorage } from "@/lib/use-local-storage"
import { uid } from "@/lib/uid"

import { revertirAsistencia } from "./actions"
import { ResumenAsistencia, TurnoResumenGrid } from "./turno-resumen"

export type { Area, Reporte } from "@/lib/asistencia"

export type HistorialEntry = {
  id: string
  asignacionId: string
  valor: number
  origen: "acomodador" | "admin" | "revert"
  reportadoAt: string
  reportadoPor: string
  esRevert: boolean
}

function defaultDia(): string {
  const today = new Date().toISOString().slice(0, 10)
  return DIAS.find((d) => d.value === today)?.value ?? DIAS[0].value
}

function defaultSesion(): Sesion {
  return new Date().getHours() < 14 ? "manana" : "tarde"
}

type StoredConteo = Partial<Conteo> & {
  id: string
  areaId: string
  areaNombre: string
  dia: string
  sesion: Sesion
  timestamp: string
}

function normalizeConteo(c: StoredConteo): Conteo {
  return {
    id: c.id,
    areaId: c.areaId,
    areaNombre: c.areaNombre,
    dia: c.dia,
    sesion: c.sesion,
    timestamp: c.timestamp,
    modo: c.modo ?? "vacios",
    capacidadSnapshot: c.capacidadSnapshot ?? 0,
    valor: c.valor ?? c.vacios ?? 0,
    origen: "manual",
  }
}

export function AsistenciaClient({
  areas,
  reportes,
  historial,
  capitanMode = false,
  shareToken,
}: {
  areas: Area[]
  reportes: Reporte[]
  historial: HistorialEntry[]
  // Un capitán solo ve sus áreas y sus conteos se guardan en la base, para
  // que administración los vea; el flujo local (localStorage) es del owner.
  capitanMode?: boolean
  // Token del enlace público de asistencia en vivo (solo para el owner).
  shareToken?: string | null
}) {
  const historialPorAsignacion = React.useMemo(() => {
    const map = new Map<string, HistorialEntry[]>()
    for (const h of historial) {
      const list = map.get(h.asignacionId) ?? []
      list.push(h)
      map.set(h.asignacionId, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.reportadoAt < b.reportadoAt ? 1 : -1))
    }
    return map
  }, [historial])

  // Datos de área/turno por asignación, para titular las filas del historial.
  const asignacionInfo = React.useMemo(() => {
    const map = new Map<
      string,
      { areaNombre: string; dia: string; sesion: Sesion }
    >()
    for (const r of reportes) {
      if (r.fuente !== "acomodador") continue
      const [diaKey, sesionKey] = r.slot.split("-") as [string, Sesion]
      const dia = SLOT_DIA[diaKey]
      if (!dia || (sesionKey !== "manana" && sesionKey !== "tarde")) continue
      if (!map.has(r.id)) {
        map.set(r.id, { areaNombre: r.areaNombre, dia, sesion: sesionKey })
      }
    }
    return map
  }, [reportes])

  const [historialAbierto, setHistorialAbierto] = React.useState<{
    asignacionId: string
    areaNombre: string
    slot?: string
  } | null>(null)
  const [conteosRaw, setConteos] = useLocalStorage<StoredConteo[]>(
    "ams-os.asistencia",
    [],
  )
  const conteos = React.useMemo(() => {
    const locales = conteosRaw.map(normalizeConteo)
    const remotos = reportes
      .map(reporteToConteo)
      .filter((c): c is Conteo => c !== null)
    const all = [...locales, ...remotos]
    all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    return all
  }, [conteosRaw, reportes])

  const resumenRows = React.useMemo(
    () => computeResumenRows(areas, conteos),
    [areas, conteos],
  )

  const [editing, setEditing] = React.useState<Conteo | null>(null)
  const [agregarOpen, setAgregarOpen] = React.useState(false)
  const [desgloseOpen, setDesgloseOpen] = React.useState(false)
  const [historialListaOpen, setHistorialListaOpen] = React.useState(false)
  const [compartirOpen, setCompartirOpen] = React.useState(false)

  function onAddLocal(conteo: Conteo) {
    setConteos((prev) => [conteo, ...prev])
  }

  function applyEdit(updated: Conteo) {
    setConteos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setEditing(null)
  }

  function deleteConteo(id: string) {
    setConteos((prev) => prev.filter((c) => c.id !== id))
    setEditing(null)
  }

  const hayHistorial = historialPorAsignacion.size > 0

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
        <section className="flex flex-col rounded-xl border bg-surface">
          {/* Cabecera con acciones, al estilo de Personal */}
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <h2 className="font-serif text-xl text-foreground">
                Resumen por turno
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Asistencia total de cada turno, según los conteos validados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setAgregarOpen(true)}>
                <PlusIcon className="size-4" />
                Agregar asistencia
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDesgloseOpen(true)}
              >
                <TableIcon className="size-4" />
                Desglose
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHistorialListaOpen(true)}
                disabled={!hayHistorial}
              >
                <HistoryIcon className="size-4" />
                Historial
              </Button>
              {!capitanMode && shareToken && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCompartirOpen(true)}
                >
                  <Share2Icon className="size-4" />
                  Compartir
                </Button>
              )}
            </div>
          </div>

          {/* Tarjetas de turno agrupadas por día */}
          <div className="border-t px-4 py-4 sm:px-5">
            <TurnoResumenGrid areas={areas} conteos={conteos} />
          </div>
        </section>
      </div>

      <AgregarAsistenciaDialog
        open={agregarOpen}
        onOpenChange={setAgregarOpen}
        areas={areas}
        capitanMode={capitanMode}
        onAddLocal={onAddLocal}
      />

      <DesgloseDialog
        open={desgloseOpen}
        onOpenChange={setDesgloseOpen}
        conteos={conteos}
        resumenRows={resumenRows}
        historialPorAsignacion={historialPorAsignacion}
        onEdit={setEditing}
        onVerHistorial={setHistorialAbierto}
      />

      <HistorialListaDialog
        open={historialListaOpen}
        onOpenChange={setHistorialListaOpen}
        historialPorAsignacion={historialPorAsignacion}
        asignacionInfo={asignacionInfo}
        onVer={(asignacionId, areaNombre, slot) => {
          setHistorialListaOpen(false)
          setHistorialAbierto({ asignacionId, areaNombre, slot })
        }}
      />

      {shareToken && (
        <CompartirDialog
          open={compartirOpen}
          onOpenChange={setCompartirOpen}
          token={shareToken}
        />
      )}

      <EditConteoDialog
        conteo={editing}
        areas={areas}
        onClose={() => setEditing(null)}
        onSave={applyEdit}
        onDelete={deleteConteo}
      />

      <HistorialDialog
        abierto={historialAbierto}
        entradas={
          historialAbierto
            ? historialPorAsignacion.get(historialAbierto.asignacionId) ?? []
            : []
        }
        onClose={() => setHistorialAbierto(null)}
      />
    </>
  )
}

function CompartirDialog({
  open,
  onOpenChange,
  token,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  token: string
}) {
  const [copied, setCopied] = React.useState(false)
  const [origin] = React.useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  )

  const url = `${origin}/asistencia/en-vivo/${token}`

  async function copy() {
    if (!origin) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignored */
    }
  }

  const waText = encodeURIComponent(
    `Sigue la asistencia de la asamblea en tiempo real: ${url}`,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir asistencia en vivo</DialogTitle>
          <DialogDescription>
            Cualquiera con este enlace puede ver el resumen de asistencia en
            tiempo real, sin iniciar sesión. Es de solo lectura.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label={copied ? "Copiado" : "Copiar enlace"}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
          <Button asChild className="w-full">
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircleIcon />
              Compartir por WhatsApp
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            El enlace muestra siempre la asistencia actualizada. Para invalidarlo
            tendrías que cambiar el token (pídelo a soporte).
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AgregarAsistenciaDialog({
  open,
  onOpenChange,
  areas,
  capitanMode,
  onAddLocal,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  areas: Area[]
  capitanMode: boolean
  onAddLocal: (c: Conteo) => void
}) {
  const [step, setStep] = React.useState<"area" | "valor">("area")
  const [selected, setSelected] = React.useState<Area | null>(null)
  const [valor, setValor] = React.useState("")
  const [dia, setDia] = React.useState<string>(() => defaultDia())
  const [sesion, setSesion] = React.useState<Sesion>(() => defaultSesion())
  const [savedAt, setSavedAt] = React.useState<number | null>(null)
  const [guardando, setGuardando] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  function handleOpenChange(v: boolean) {
    if (!v) {
      setStep("area")
      setSelected(null)
      setValor("")
      setSavedAt(null)
      setSaveError(null)
    }
    onOpenChange(v)
  }

  function pickArea(area: Area) {
    setSelected(area)
    setStep("valor")
    setValor("")
    setDia(defaultDia())
    setSesion(defaultSesion())
    setSaveError(null)
  }

  function backToAreas() {
    setSelected(null)
    setStep("area")
    setValor("")
  }

  React.useEffect(() => {
    if (savedAt === null) return
    const t = setTimeout(() => setSavedAt(null), 2000)
    return () => clearTimeout(t)
  }, [savedAt])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || guardando) return
    const n = Number.parseInt(valor, 10)
    if (Number.isNaN(n) || n < 0) return
    const modo = modoDeArea(selected)
    if (modo === "vacios" && n > selected.capacidad) return

    if (capitanMode) {
      const diaKey = DIA_A_SLOT[dia]
      if (!diaKey) return
      setGuardando(true)
      setSaveError(null)
      const { ok, error } = await reportarConteoCapitan({
        areaId: selected.id,
        slot: `${diaKey}-${sesion}`,
        valor: n,
      })
      setGuardando(false)
      if (!ok) {
        setSaveError(error ?? "No se pudo guardar el conteo.")
        return
      }
      setSavedAt(Date.now())
      backToAreas()
      return
    }

    onAddLocal({
      id: uid(),
      areaId: selected.id,
      areaNombre: selected.nombre,
      modo,
      capacidadSnapshot: selected.capacidad,
      valor: n,
      dia,
      sesion,
      timestamp: new Date().toISOString(),
      origen: "manual",
    })
    setSavedAt(Date.now())
    backToAreas()
  }

  const selectedModo = selected ? modoDeArea(selected) : "vacios"
  const valorNum = Number.parseInt(valor, 10)
  const valorValido = !Number.isNaN(valorNum) && valorNum >= 0
  const excedeCapacidad =
    selected !== null &&
    selectedModo === "vacios" &&
    valorValido &&
    valorNum > selected.capacidad

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar asistencia</DialogTitle>
          <DialogDescription>
            {step === "area"
              ? "Toca el área donde estás contando."
              : "Indica el día, la sesión y el conteo."}
          </DialogDescription>
        </DialogHeader>

        {savedAt !== null && (
          <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
            <CheckIcon className="size-4" /> Conteo guardado
          </p>
        )}

        {step === "area" ? (
          areas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No hay áreas registradas todavía.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/areas">Crear áreas</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {areas.map((a) => {
                const modo = modoDeArea(a)
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => pickArea(a)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{a.nombre}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.piso}
                          {" · "}
                          {modo === "vacios"
                            ? `Cap. ${a.capacidad}`
                            : "Sin capacidad fija"}
                        </p>
                      </div>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )
        ) : (
          <form onSubmit={save}>
            <button
              type="button"
              onClick={backToAreas}
              className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" />
              Cambiar área
            </button>
            <h3 className="mt-3 font-serif text-2xl text-foreground">
              {selected?.nombre}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected?.piso}
              {selectedModo === "vacios"
                ? ` · Capacidad ${selected?.capacidad}`
                : " · Sin capacidad fija — los conteos se suman"}
            </p>

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
              htmlFor="valor"
              className="mt-6 block text-sm font-medium text-foreground"
            >
              {selectedModo === "vacios"
                ? "Lugares vacíos"
                : "Asistentes contados"}
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedModo === "vacios"
                ? `Se restarán a la capacidad (${selected?.capacidad}) del área.`
                : "Se sumarán al total de esta área en la sesión."}
            </p>
            <Input
              id="valor"
              type="number"
              inputMode="numeric"
              min={0}
              max={selectedModo === "vacios" ? selected?.capacidad : undefined}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0"
              autoFocus
              required
              className="mt-2 h-14 text-2xl tabular-nums"
            />
            {excedeCapacidad && (
              <p className="mt-2 text-sm text-destructive">
                No puede ser mayor a la capacidad ({selected?.capacidad}).
              </p>
            )}

            {valorValido && !excedeCapacidad && selected && (
              <p className="mt-3 text-sm text-muted-foreground">
                {selectedModo === "vacios" ? (
                  <>
                    Asistencia calculada:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {selected.capacidad - valorNum}
                    </span>
                  </>
                ) : (
                  <>
                    Se agregará{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {valorNum}
                    </span>{" "}
                    al total del área.
                  </>
                )}
              </p>
            )}

            {saveError && (
              <p className="mt-3 text-sm text-destructive">{saveError}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={valor === "" || excedeCapacidad || guardando}
            >
              {guardando ? "Guardando…" : "Guardar conteo"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DesgloseDialog({
  open,
  onOpenChange,
  conteos,
  resumenRows,
  historialPorAsignacion,
  onEdit,
  onVerHistorial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  conteos: Conteo[]
  resumenRows: ReturnType<typeof computeResumenRows>
  historialPorAsignacion: Map<string, HistorialEntry[]>
  onEdit: (c: Conteo) => void
  onVerHistorial: (info: {
    asignacionId: string
    areaNombre: string
    slot?: string
  }) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Desglose de asistencia</DialogTitle>
          <DialogDescription>
            Detalle por área y sesión, y los conteos registrados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-8">
          <ResumenAsistencia rows={resumenRows} />
          <UltimosConteosTabla
            conteos={conteos}
            historialPorAsignacion={historialPorAsignacion}
            onEdit={onEdit}
            onVerHistorial={onVerHistorial}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UltimosConteosTabla({
  conteos,
  historialPorAsignacion,
  onEdit,
  onVerHistorial,
}: {
  conteos: Conteo[]
  historialPorAsignacion: Map<string, HistorialEntry[]>
  onEdit: (c: Conteo) => void
  onVerHistorial: (info: {
    asignacionId: string
    areaNombre: string
    slot?: string
  }) => void
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Últimos conteos</h3>
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
              <TableHead className="text-right">Conteo</TableHead>
              <TableHead className="text-right">Asistencia</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Editar</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conteos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
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
                    <span>{c.areaNombre}</span>
                    {c.reportadoPor && c.origen !== "manual" && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
                        {c.reportadoPor}
                      </span>
                    )}
                    {c.origen === "acomodador" && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                        Sin validar
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.modo === "vacios" ? (
                      <>
                        <span className="font-medium">{c.valor}</span>
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          vacíos
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">+{c.valor}</span>
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          asist.
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {asistenciaFromConteo(c)}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.origen === "manual" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(c)}
                        aria-label="Editar conteo"
                      >
                        <PencilIcon />
                      </Button>
                    ) : (
                      (() => {
                        const asignacionId = c.id.startsWith("db-")
                          ? c.id.slice(3)
                          : null
                        if (!asignacionId) return null
                        const tieneHistorial =
                          (historialPorAsignacion.get(asignacionId)?.length ??
                            0) > 0
                        if (!tieneHistorial) return null
                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              onVerHistorial({
                                asignacionId,
                                areaNombre: c.areaNombre,
                                slot: `${formatDia(c.dia)} · ${
                                  c.sesion ? SESION_LABEL[c.sesion] : ""
                                }`,
                              })
                            }
                            aria-label="Ver historial"
                          >
                            <HistoryIcon />
                          </Button>
                        )
                      })()
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function HistorialListaDialog({
  open,
  onOpenChange,
  historialPorAsignacion,
  asignacionInfo,
  onVer,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  historialPorAsignacion: Map<string, HistorialEntry[]>
  asignacionInfo: Map<
    string,
    { areaNombre: string; dia: string; sesion: Sesion }
  >
  onVer: (asignacionId: string, areaNombre: string, slot?: string) => void
}) {
  // Una fila por asignación con historial, ordenadas por movimiento más reciente.
  const items = React.useMemo(() => {
    const list: {
      asignacionId: string
      areaNombre: string
      slot?: string
      vigente: HistorialEntry
      movimientos: number
    }[] = []
    for (const [asignacionId, entradas] of historialPorAsignacion) {
      if (entradas.length === 0) continue
      const info = asignacionInfo.get(asignacionId)
      list.push({
        asignacionId,
        areaNombre: info?.areaNombre ?? "Área",
        slot: info
          ? `${formatDia(info.dia)} · ${SESION_LABEL[info.sesion]}`
          : undefined,
        vigente: entradas[0],
        movimientos: entradas.length,
      })
    }
    list.sort((a, b) =>
      a.vigente.reportadoAt < b.vigente.reportadoAt ? 1 : -1,
    )
    return list
  }, [historialPorAsignacion, asignacionInfo])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de asistencia</DialogTitle>
          <DialogDescription>
            Áreas con movimientos registrados. Abre una para ver el detalle y
            regresar a un reporte anterior.
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay movimientos registrados.
          </p>
        ) : (
          <ul className="grid gap-2">
            {items.map((it) => (
              <li key={it.asignacionId}>
                <button
                  type="button"
                  onClick={() => onVer(it.asignacionId, it.areaNombre, it.slot)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {it.areaNombre}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {it.slot ? `${it.slot} · ` : ""}
                      {it.movimientos} movimiento
                      {it.movimientos === 1 ? "" : "s"} · último cambio{" "}
                      {formatTimestamp(it.vigente.reportadoAt)}
                    </p>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function origenLabel(origen: HistorialEntry["origen"]): string {
  if (origen === "acomodador") return "Acomodador"
  if (origen === "admin") return "Admin"
  return "Reversión"
}

function HistorialDialog({
  abierto,
  entradas,
  onClose,
}: {
  abierto: {
    asignacionId: string
    areaNombre: string
    slot?: string
  } | null
  entradas: HistorialEntry[]
  onClose: () => void
}) {
  const [confirmando, setConfirmando] = React.useState<HistorialEntry | null>(
    null,
  )
  const [enviando, setEnviando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const open = abierto !== null
  const vigenteId = entradas[0]?.id ?? null

  async function aplicarRevert() {
    if (!confirmando) return
    setEnviando(true)
    setError(null)
    const { ok, error: err } = await revertirAsistencia(confirmando.id)
    setEnviando(false)
    if (!ok) {
      setError(err ?? "No se pudo revertir.")
      return
    }
    setConfirmando(null)
    onClose()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            onClose()
            setError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Historial de movimientos</DialogTitle>
            <DialogDescription>
              {abierto?.areaNombre}
              {abierto?.slot ? ` · ${abierto.slot}` : ""}
            </DialogDescription>
          </DialogHeader>

          {entradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin movimientos registrados.
            </p>
          ) : (
            <ul className="grid gap-2">
              {entradas.map((e) => {
                const esVigente = e.id === vigenteId
                return (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium tabular-nums">
                          {e.valor}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {origenLabel(e.origen)}
                          {e.esRevert ? " (revertido)" : ""}
                        </span>
                        {esVigente && (
                          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
                            Vigente
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatTimestamp(e.reportadoAt)} · {e.reportadoPor}
                      </p>
                    </div>
                    {!esVigente && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setError(null)
                          setConfirmando(e)
                        }}
                      >
                        <Undo2Icon />
                        Regresar
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmando !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmando(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regresar a este reporte</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se creará un nuevo reporte con el valor{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {confirmando?.valor}
                  </span>{" "}
                  y se marcará como vigente. El historial anterior se conserva.
                </p>
                {confirmando && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm text-foreground">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Reportado</span>
                      <span>{formatTimestamp(confirmando.reportadoAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Por</span>
                      <span>{confirmando.reportadoPor}</span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                aplicarRevert()
              }}
              disabled={enviando}
            >
              {enviando ? "Aplicando…" : "Confirmar y regresar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  return (
    <Dialog
      open={conteo !== null}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar conteo</DialogTitle>
          <DialogDescription>
            Cambia el área, día, sesión o el conteo registrado.
          </DialogDescription>
        </DialogHeader>
        {conteo && (
          <EditConteoForm
            key={conteo.id}
            conteo={conteo}
            areas={areas}
            onSave={onSave}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditConteoForm({
  conteo,
  areas,
  onSave,
  onDelete,
}: {
  conteo: Conteo
  areas: Area[]
  onSave: (c: Conteo) => void
  onDelete: (id: string) => void
}) {
  const [areaId, setAreaId] = React.useState(conteo.areaId)
  const [dia, setDia] = React.useState<string>(conteo.dia ?? DIAS[0].value)
  const [sesion, setSesion] = React.useState<Sesion>(conteo.sesion ?? "manana")
  const [valor, setValor] = React.useState(String(conteo.valor))

  // include the original area even if it's been deleted, so the select stays valid
  const options = React.useMemo<Area[]>(() => {
    if (areas.some((a) => a.id === conteo.areaId)) return areas
    return [
      ...areas,
      {
        id: conteo.areaId,
        piso: "",
        nombre: `${conteo.areaNombre} (eliminada)`,
        capacidad: conteo.capacidadSnapshot,
      },
    ]
  }, [areas, conteo])

  const currentArea = options.find((a) => a.id === areaId)
  const modo = currentArea ? modoDeArea(currentArea) : conteo.modo
  const valorNum = Number.parseInt(valor, 10)
  const valorValido = !Number.isNaN(valorNum) && valorNum >= 0
  const excedeCapacidad =
    currentArea !== undefined &&
    modo === "vacios" &&
    valorValido &&
    valorNum > currentArea.capacidad

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentArea) return
    if (!valorValido || excedeCapacidad) return
    onSave({
      ...conteo,
      areaId,
      areaNombre: currentArea.nombre.replace(" (eliminada)", ""),
      dia,
      sesion,
      modo,
      capacidadSnapshot: currentArea.capacidad,
      valor: valorNum,
    })
  }

  return (
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
          <p className="block text-sm font-medium text-foreground">Sesión</p>
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
          htmlFor="edit-valor"
          className="block text-sm font-medium text-foreground"
        >
          {modo === "vacios" ? "Lugares vacíos" : "Asistentes contados"}
        </label>
        {currentArea && (
          <p className="mt-1 text-xs text-muted-foreground">
            {modo === "vacios"
              ? `Se restarán a la capacidad (${currentArea.capacidad}).`
              : "Se sumarán al total del área."}
          </p>
        )}
        <Input
          id="edit-valor"
          type="number"
          inputMode="numeric"
          min={0}
          max={modo === "vacios" ? currentArea?.capacidad : undefined}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
          className="mt-2 tabular-nums"
        />
        {excedeCapacidad && currentArea && (
          <p className="mt-2 text-sm text-destructive">
            No puede ser mayor a la capacidad ({currentArea.capacidad}).
          </p>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onDelete(conteo.id)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon />
          Eliminar
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={!valorValido || excedeCapacidad}
        >
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  )
}

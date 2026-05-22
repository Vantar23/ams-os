"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  HistoryIcon,
  PencilIcon,
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
import { useLocalStorage } from "@/lib/use-local-storage"
import { uid } from "@/lib/uid"

import { revertirAsistencia } from "./actions"

export type Area = {
  id: string
  piso: string
  nombre: string
  capacidad: number
}

export type Reporte = {
  id: string
  slot: string
  valor: number
  reportadoAt: string
  areaId: string
  areaNombre: string
  areaCapacidad: number
  acomodadorNombre: string
}

export type HistorialEntry = {
  id: string
  asignacionId: string
  valor: number
  origen: "acomodador" | "admin" | "revert"
  reportadoAt: string
  reportadoPor: string
  esRevert: boolean
}

type Sesion = "manana" | "tarde"

type Modo = "vacios" | "asistentes"

type Conteo = {
  id: string
  areaId: string
  areaNombre: string
  modo: Modo
  capacidadSnapshot: number
  valor: number
  dia: string
  sesion: Sesion
  timestamp: string
  origen: "manual" | "acomodador"
  reportadoPor?: string
  // legacy field, kept for backward-compat reads
  vacios?: number
}

const SLOT_DIA: Record<string, string> = {
  viernes: "2026-10-02",
  sabado: "2026-10-03",
  domingo: "2026-10-04",
}

function reporteToConteo(r: Reporte): Conteo | null {
  const [diaKey, sesionKey] = r.slot.split("-") as [string, Sesion]
  const dia = SLOT_DIA[diaKey]
  if (!dia || (sesionKey !== "manana" && sesionKey !== "tarde")) return null
  const modo: Modo = r.areaCapacidad > 0 ? "vacios" : "asistentes"
  return {
    id: `db-${r.id}`,
    areaId: r.areaId,
    areaNombre: r.areaNombre,
    modo,
    capacidadSnapshot: r.areaCapacidad,
    valor: r.valor,
    dia,
    sesion: sesionKey,
    timestamp: r.reportadoAt,
    origen: "acomodador",
    reportadoPor: r.acomodadorNombre,
  }
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

function modoDeArea(area: Pick<Area, "capacidad">): Modo {
  return area.capacidad > 0 ? "vacios" : "asistentes"
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

function asistenciaFromConteo(c: Conteo): number {
  if (c.modo === "asistentes") return Math.max(0, c.valor)
  return Math.max(0, c.capacidadSnapshot - c.valor)
}

export function AsistenciaClient({
  areas,
  reportes,
  historial,
}: {
  areas: Area[]
  reportes: Reporte[]
  historial: HistorialEntry[]
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

  const [step, setStep] = React.useState<"area" | "valor">("area")
  const [selected, setSelected] = React.useState<Area | null>(null)
  const [valor, setValor] = React.useState("")
  const [dia, setDia] = React.useState<string>(() => defaultDia())
  const [sesion, setSesion] = React.useState<Sesion>(() => defaultSesion())
  const [savedAt, setSavedAt] = React.useState<number | null>(null)

  const [editing, setEditing] = React.useState<Conteo | null>(null)

  function pickArea(area: Area) {
    setSelected(area)
    setStep("valor")
    setValor("")
    setDia(defaultDia())
    setSesion(defaultSesion())
  }

  function reset() {
    setSelected(null)
    setStep("area")
    setValor("")
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const n = Number.parseInt(valor, 10)
    if (Number.isNaN(n) || n < 0) return
    const modo = modoDeArea(selected)
    if (modo === "vacios" && n > selected.capacidad) return
    const conteo: Conteo = {
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

  const selectedModo = selected ? modoDeArea(selected) : "vacios"
  const valorNum = Number.parseInt(valor, 10)
  const valorValido = !Number.isNaN(valorNum) && valorNum >= 0
  const excedeCapacidad =
    selected !== null &&
    selectedModo === "vacios" &&
    valorValido &&
    valorNum > selected.capacidad

  return (
    <>
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
                Toca el área donde estás contando.
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
                            <p className="font-medium text-foreground">
                              {a.nombre}
                            </p>
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

              <Button
                type="submit"
                size="lg"
                className="mt-6 w-full"
                disabled={valor === "" || excedeCapacidad}
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

        <ResumenAsistencia areas={areas} conteos={conteos} />

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
                        {c.origen === "acomodador" && (
                          <span className="ml-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
                            {c.reportadoPor ?? "Acomodador"}
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
                            onClick={() => setEditing(c)}
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
                              (historialPorAsignacion.get(asignacionId)
                                ?.length ?? 0) > 0
                            if (!tieneHistorial) return null
                            return (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setHistorialAbierto({
                                    asignacionId,
                                    areaNombre: c.areaNombre,
                                    slot: `${formatDia(c.dia)} · ${
                                      c.sesion
                                        ? SESION_LABEL[c.sesion]
                                        : ""
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
      </div>

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

function formatTimestamp(iso: string): string {
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

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
            <AlertDialogCancel disabled={enviando}>
              Cancelar
            </AlertDialogCancel>
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

function ResumenAsistencia({
  areas,
  conteos,
}: {
  areas: Area[]
  conteos: Conteo[]
}) {
  type Key = string
  type Row = {
    key: Key
    dia: string
    sesion: Sesion
    areaId: string
    areaNombre: string
    modo: Modo
    capacidad: number
    asistencia: number
  }

  const filas = React.useMemo<Row[]>(() => {
    const byKey = new Map<Key, Conteo[]>()
    for (const c of conteos) {
      const k = `${c.dia}|${c.sesion}|${c.areaId}`
      const list = byKey.get(k) ?? []
      list.push(c)
      byKey.set(k, list)
    }
    const rows: Row[] = []
    for (const [key, list] of byKey) {
      // sort newest first
      list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      const head = list[0]
      const liveArea = areas.find((a) => a.id === head.areaId)
      const capacidad = liveArea?.capacidad ?? head.capacidadSnapshot
      const modo: Modo = liveArea
        ? modoDeArea(liveArea)
        : head.modo
      let asistencia = 0
      if (modo === "asistentes") {
        asistencia = list.reduce((sum, c) => sum + c.valor, 0)
      } else {
        // most recent measurement
        asistencia = Math.max(0, capacidad - head.valor)
      }
      rows.push({
        key,
        dia: head.dia,
        sesion: head.sesion,
        areaId: head.areaId,
        areaNombre: liveArea?.nombre ?? head.areaNombre,
        modo,
        capacidad,
        asistencia,
      })
    }
    rows.sort((a, b) => {
      if (a.dia !== b.dia) return a.dia.localeCompare(b.dia)
      if (a.sesion !== b.sesion) return a.sesion.localeCompare(b.sesion)
      return a.areaNombre.localeCompare(b.areaNombre)
    })
    return rows
  }, [areas, conteos])

  if (filas.length === 0) return null

  const totalesPorSesion = new Map<string, number>()
  for (const f of filas) {
    const k = `${f.dia}|${f.sesion}`
    totalesPorSesion.set(k, (totalesPorSesion.get(k) ?? 0) + f.asistencia)
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Resumen de asistencia</h2>
      <p className="text-sm text-muted-foreground">
        Calculado por área y sesión a partir de los conteos.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Día</TableHead>
              <TableHead>Sesión</TableHead>
              <TableHead>Área</TableHead>
              <TableHead className="text-right">Capacidad</TableHead>
              <TableHead className="text-right">Asistencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.key}>
                <TableCell className="text-muted-foreground">
                  {formatDia(f.dia)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {SESION_LABEL[f.sesion]}
                </TableCell>
                <TableCell className="font-medium">{f.areaNombre}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {f.modo === "vacios" ? f.capacidad : "—"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {f.asistencia}
                </TableCell>
              </TableRow>
            ))}
            {Array.from(totalesPorSesion.entries()).map(([k, total]) => {
              const [dia, sesion] = k.split("|") as [string, Sesion]
              return (
                <TableRow key={`total-${k}`} className="bg-muted/40">
                  <TableCell className="font-medium">
                    {formatDia(dia)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {SESION_LABEL[sesion]}
                  </TableCell>
                  <TableCell className="font-medium" colSpan={2}>
                    Total de la sesión
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {total}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
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
  const [valor, setValor] = React.useState("")

  React.useEffect(() => {
    if (!conteo) return
    setAreaId(conteo.areaId)
    setDia(conteo.dia ?? DIAS[0].value)
    setSesion(conteo.sesion ?? "manana")
    setValor(String(conteo.valor))
  }, [conteo])

  const open = conteo !== null

  // include the original area even if it's been deleted, so the select stays valid
  const options = React.useMemo<Area[]>(() => {
    if (!conteo) return areas
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
  const modo: Modo = currentArea
    ? modoDeArea(currentArea)
    : conteo?.modo ?? "vacios"
  const valorNum = Number.parseInt(valor, 10)
  const valorValido = !Number.isNaN(valorNum) && valorNum >= 0
  const excedeCapacidad =
    currentArea !== undefined &&
    modo === "vacios" &&
    valorValido &&
    valorNum > currentArea.capacidad

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!conteo || !currentArea) return
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
            Cambia el área, día, sesión o el conteo registrado.
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
              onClick={() => conteo && onDelete(conteo.id)}
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

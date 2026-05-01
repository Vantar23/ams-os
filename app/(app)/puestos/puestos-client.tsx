"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadDia,
  type DisponibilidadSesion,
  type DisponibilidadSlot,
} from "@/lib/disponibilidad"
import { cn } from "@/lib/utils"

import { asignarPuesto, quitarPuesto } from "./actions"

type Asamblea = { id: string; numero: string; edicion: string }

type Area = {
  id: string
  piso: string
  nombre: string
  filas: number
  acomodadores_necesarios: number
  capacidad: number
}

type Acomodador = {
  id: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  disponibilidad: string[]
}

type Asignacion = {
  acomodador_id: string
  area_id: string
  slot: string
}

type LocalState = {
  // Map<acomodador_id, areaId | null> for the currently selected slot.
  // null = unassigned. Missing key = use persisted value.
  overrides: Record<string, string | null>
}

export function PuestosClient({
  asamblea,
  areas,
  acomodadores,
  asignaciones,
}: {
  asamblea: Asamblea
  areas: Area[]
  acomodadores: Acomodador[]
  asignaciones: Asignacion[]
}) {
  const router = useRouter()
  const [dia, setDia] = React.useState<DisponibilidadDia>("viernes")
  const [sesion, setSesion] = React.useState<DisponibilidadSesion>("manana")
  const [areaId, setAreaId] = React.useState<string>(areas[0]?.id ?? "")
  const [state, setState] = React.useState<LocalState>({ overrides: {} })

  const slot = `${dia}-${sesion}` as DisponibilidadSlot
  const area = areas.find((a) => a.id === areaId) ?? null

  // Persisted assignment for this acomodador in the current slot.
  const persistedAreaFor = React.useMemo(() => {
    const map = new Map<string, string | null>()
    for (const a of asignaciones) {
      if (a.slot === slot) map.set(a.acomodador_id, a.area_id)
    }
    return map
  }, [asignaciones, slot])

  function currentAreaFor(acomodadorId: string): string | null {
    if (acomodadorId in state.overrides) return state.overrides[acomodadorId]
    return persistedAreaFor.get(acomodadorId) ?? null
  }

  // Reset overrides when slot changes (assignments live per slot).
  React.useEffect(() => {
    setState({ overrides: {} })
  }, [slot])

  async function asignar(acomodadorId: string) {
    if (!area) return
    setState((s) => ({
      overrides: { ...s.overrides, [acomodadorId]: area.id },
    }))
    const { error } = await asignarPuesto({
      asambleaId: asamblea.id,
      areaId: area.id,
      acomodadorId,
      slot,
    })
    if (error) {
      setState((s) => {
        const copy = { ...s.overrides }
        delete copy[acomodadorId]
        return { overrides: copy }
      })
      alert(error)
      return
    }
    router.refresh()
  }

  async function quitar(acomodadorId: string) {
    setState((s) => ({
      overrides: { ...s.overrides, [acomodadorId]: null },
    }))
    const { error } = await quitarPuesto({ acomodadorId, slot })
    if (error) {
      setState((s) => {
        const copy = { ...s.overrides }
        delete copy[acomodadorId]
        return { overrides: copy }
      })
      alert(error)
      return
    }
    router.refresh()
  }

  // Group acomodadores for the current slot.
  const asignadosAEsta: Acomodador[] = []
  const sinAsignar: Acomodador[] = []
  const enOtraArea: { acomodador: Acomodador; areaId: string }[] = []

  for (const ac of acomodadores) {
    const current = currentAreaFor(ac.id)
    if (current === area?.id && current) {
      asignadosAEsta.push(ac)
    } else if (current && current !== area?.id) {
      enOtraArea.push({ acomodador: ac, areaId: current })
    } else {
      sinAsignar.push(ac)
    }
  }

  const areaById = new Map(areas.map((a) => [a.id, a]))

  // Per-area headcount for current slot.
  const headcountByArea = new Map<string, number>()
  for (const ac of acomodadores) {
    const target = currentAreaFor(ac.id)
    if (!target) continue
    headcountByArea.set(target, (headcountByArea.get(target) ?? 0) + 1)
  }

  const areaShortfalls = areas.map((a) => {
    const asignados = headcountByArea.get(a.id) ?? 0
    const faltan = Math.max(0, a.acomodadores_necesarios - asignados)
    return { area: a, asignados, faltan }
  })

  const totalFaltantes = areaShortfalls.reduce((s, x) => s + x.faltan, 0)

  if (areas.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">Puestos</h2>
          <p className="text-sm text-muted-foreground">
            Asamblea N° {asamblea.numero} — {asamblea.edicion}
          </p>
        </div>
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Aún no hay áreas. Agrega un área primero para poder asignar puestos.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">Puestos</h2>
        <p className="text-sm text-muted-foreground">
          Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
      </div>

      {/* Filters: día, turno, área */}
      <div className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-[auto_auto_1fr] sm:items-end">
        <div className="grid gap-1.5">
          <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Día
          </Label>
          <div className="inline-flex rounded-full border bg-background p-0.5 text-xs">
            {DISPONIBILIDAD_DIAS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDia(d.key)}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  dia === d.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Turno
          </Label>
          <div className="inline-flex rounded-full border bg-background p-0.5 text-xs">
            {DISPONIBILIDAD_SESIONES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSesion(s.key)}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  sesion === s.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="area"
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          >
            Área
          </Label>
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger id="area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.piso} · {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Faltantes resumen */}
      <section className="rounded-xl border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Faltantes en este turno
          </h3>
          <p
            className={cn(
              "text-sm",
              totalFaltantes > 0
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {totalFaltantes === 0
              ? "Todas las áreas cubiertas"
              : `${totalFaltantes} acomodador${totalFaltantes === 1 ? "" : "es"} por asignar`}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {areaShortfalls.map(({ area: a, asignados, faltan }) => {
            const active = a.id === areaId
            const short = faltan > 0
            const complete = !short && a.acomodadores_necesarios > 0
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAreaId(a.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted",
                  short &&
                    !active &&
                    "border-destructive/40 bg-destructive/5 text-destructive",
                  short && active && "border-destructive",
                  complete &&
                    !active &&
                    "border-primary/50 bg-primary/10 text-primary",
                  complete && active && "border-primary",
                )}
              >
                <span className="font-medium">{a.nombre}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    short
                      ? "text-destructive"
                      : complete
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {asignados}/{a.acomodadores_necesarios}
                </span>
                {short && (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                    -{faltan}
                  </span>
                )}
                {complete && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    OK
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {area && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Asignados */}
          <section className="rounded-xl border bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3 border-b pb-2">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Asignados a {area.nombre} ({asignadosAEsta.length} /{" "}
                {area.acomodadores_necesarios})
              </h3>
            </div>
            {asignadosAEsta.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nadie asignado todavía. Agrega del lado derecho.
              </p>
            ) : (
              <ul className="divide-y">
                {asignadosAEsta.map((ac) => (
                  <li
                    key={ac.id}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {ac.nombre} {ac.apellido}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {ac.congregacion}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => quitar(ac.id)}
                    >
                      <MinusIcon />
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Sin asignar (+ otra area) */}
          <section className="rounded-xl border bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3 border-b pb-2">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Sin asignar ({sinAsignar.length})
              </h3>
            </div>
            {sinAsignar.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Todos los acomodadores ya tienen asignación para este turno.
              </p>
            ) : (
              <ul className="divide-y">
                {sinAsignar.map((ac) => {
                  const disponible = ac.disponibilidad.includes(slot)
                  return (
                    <li
                      key={ac.id}
                      className="flex items-center gap-3 py-2"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {ac.nombre} {ac.apellido}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {ac.congregacion}
                          {!disponible && " · sin disponibilidad"}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => asignar(ac.id)}
                      >
                        <PlusIcon />
                        Asignar
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}

            {enOtraArea.length > 0 && (
              <>
                <div className="mt-6 border-b pb-2">
                  <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    En otra área ({enOtraArea.length})
                  </h4>
                </div>
                <ul className="divide-y">
                  {enOtraArea.map(({ acomodador: ac, areaId: aId }) => {
                    const otherArea = areaById.get(aId)
                    return (
                      <li
                        key={ac.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">
                            {ac.nombre} {ac.apellido}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {otherArea
                              ? `Asignado en ${otherArea.nombre}`
                              : "Asignado en otra área"}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => asignar(ac.id)}
                        >
                          <PlusIcon />
                          Mover aquí
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

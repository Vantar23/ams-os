"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DIAS,
  SESIONES,
  SESION_LABEL,
  computeResumenPorTurno,
  computeResumenRows,
  formatDia,
  type Area,
  type Conteo,
  type ResumenRow,
  type Sesion,
} from "@/lib/asistencia"

/** Tarjetas de asistencia por turno (día × sesión), agrupadas por día. */
export function TurnoResumenGrid({
  areas,
  conteos,
}: {
  areas: Area[]
  conteos: Conteo[]
}) {
  const resumenRows = React.useMemo(
    () => computeResumenRows(areas, conteos),
    [areas, conteos],
  )
  const resumenPorTurno = React.useMemo(
    () => computeResumenPorTurno(resumenRows),
    [resumenRows],
  )

  return (
    <div className="grid gap-6">
      {DIAS.map((d) => (
        <div key={d.value}>
          <p className="px-1 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {d.label}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {SESIONES.map((s) => {
              const datos = resumenPorTurno.get(`${d.value}|${s}`)
              const contadas = datos?.contadas
              const faltantes = areas.filter((a) => !contadas?.has(a.id))
              return (
                <TurnoCard
                  key={s}
                  sesionLabel={SESION_LABEL[s]}
                  asistencia={datos?.asistencia ?? 0}
                  areasTotal={areas.length}
                  faltantes={faltantes}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TurnoCard({
  sesionLabel,
  asistencia,
  areasTotal,
  faltantes,
}: {
  sesionLabel: string
  asistencia: number
  areasTotal: number
  faltantes: Area[]
}) {
  const [abierto, setAbierto] = React.useState(false)
  const areasRep = areasTotal - faltantes.length
  const interactivo = areasTotal > 0 && faltantes.length > 0

  const contenido = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{sesionLabel}</p>
        {interactivo && (
          <ChevronDownIcon
            className={
              "size-4 shrink-0 text-foreground transition-transform " +
              (abierto ? "rotate-180" : "")
            }
            strokeWidth={2.5}
          />
        )}
      </div>
      <p className="mt-3 font-serif text-3xl tabular-nums text-foreground">
        {asistencia}
      </p>

      {areasTotal === 0 ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sin áreas registradas
        </p>
      ) : faltantes.length === 0 ? (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
          <CheckIcon className="size-3.5" />
          {areasRep} de {areasTotal} área{areasTotal === 1 ? "" : "s"} · todas
          contadas
        </p>
      ) : (
        <>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {areasRep} de {areasTotal} área{areasTotal === 1 ? "" : "s"} contada
            {areasRep === 1 ? "" : "s"}
          </p>
          {abierto && (
            <div className="mt-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400">
                Faltan por contar
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {faltantes.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex max-w-full items-center truncate rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-muted-foreground"
                    title={`${a.piso} · ${a.nombre}`}
                  >
                    {a.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )

  if (!interactivo) {
    return (
      <div className="rounded-xl border border-border bg-background p-4">
        {contenido}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setAbierto((v) => !v)}
      aria-expanded={abierto}
      aria-label={`Ver las ${faltantes.length} áreas que faltan por contar`}
      className="rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {contenido}
    </button>
  )
}

/** Tabla de asistencia por área y sesión, con totales por sesión. */
export function ResumenAsistencia({ rows }: { rows: ResumenRow[] }) {
  if (rows.length === 0) {
    return (
      <section>
        <h3 className="text-base font-semibold">Resumen de asistencia</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Aún no hay conteos validados.
        </p>
      </section>
    )
  }

  const totalesPorSesion = new Map<string, number>()
  for (const f of rows) {
    const k = `${f.dia}|${f.sesion}`
    totalesPorSesion.set(k, (totalesPorSesion.get(k) ?? 0) + f.asistencia)
  }

  return (
    <section>
      <h3 className="text-base font-semibold">Resumen de asistencia</h3>
      <p className="text-sm text-muted-foreground">
        Calculado por área y sesión a partir de los conteos validados por
        capitanes. Los reportes de acomodadores son solo de referencia.
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
            {rows.map((f) => (
              <TableRow key={f.key}>
                <TableCell className="text-muted-foreground">
                  {formatDia(f.dia)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {SESION_LABEL[f.sesion as Sesion]}
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
                  <TableCell className="font-medium">{formatDia(dia)}</TableCell>
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

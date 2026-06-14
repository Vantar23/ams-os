"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RadioIcon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  DIAS,
  SESIONES,
  SESION_LABEL,
  computeResumenPorTurno,
  computeResumenRows,
  formatDia,
  reporteToConteo,
  type Area,
  type Conteo,
  type Reporte,
  type Sesion,
} from "@/lib/asistencia"

// Cada cuánto se refresca la vista pública (cómodo para "tiempo real" sin
// abrir realtime a usuarios anónimos).
const REFRESH_MS = 12000

export function AsistenciaPublicaView({
  asamblea,
  areas,
  reportes,
}: {
  asamblea: { numero: string; edicion: string; sede: string; fechas: string }
  areas: Area[]
  reportes: Reporte[]
}) {
  const router = useRouter()
  // El desglose se ve un turno a la vez: siempre hay un día y un turno elegidos.
  const [diaFiltro, setDiaFiltro] = React.useState<string>(DIAS[0].value)
  const [turnoFiltro, setTurnoFiltro] = React.useState<Sesion>("manana")

  // Re-renderiza el server component periódicamente para traer datos frescos.
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS)
    return () => clearInterval(id)
  }, [router])

  const conteos = React.useMemo<Conteo[]>(() => {
    const list = reportes
      .map(reporteToConteo)
      .filter((c): c is Conteo => c !== null)
    list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    return list
  }, [reportes])

  const resumenRows = React.useMemo(
    () => computeResumenRows(areas, conteos),
    [areas, conteos],
  )
  const resumenPorTurno = React.useMemo(
    () => computeResumenPorTurno(resumenRows),
    [resumenRows],
  )

  const totalGeneral = resumenRows.reduce((s, r) => s + r.asistencia, 0)

  const filas = resumenRows.filter(
    (r) => r.dia === diaFiltro && r.sesion === turnoFiltro,
  )
  const totalFiltrado = filas.reduce((s, r) => s + r.asistencia, 0)

  return (
    <main className="min-h-svh bg-background">
      <header className="bg-primary px-5 pb-8 pt-10 text-primary-foreground sm:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em]">
            <RadioIcon className="size-3.5" />
            En vivo
          </span>
          <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
            Asistencia
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/90">
            Asamblea N° {asamblea.numero} — {asamblea.edicion}
            {asamblea.sede ? ` · ${asamblea.sede}` : ""}
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
            Total acumulado
          </p>
          <p className="font-serif text-5xl tabular-nums">{totalGeneral}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        {/* Resumen por turno: solo el total de cada turno */}
        <section>
          <h2 className="font-serif text-xl text-foreground">
            Resumen por turno
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Asistencia total de cada turno. Se actualiza automáticamente.
          </p>
          <div className="mt-4 grid gap-6">
            {DIAS.map((d) => (
              <div key={d.value}>
                <p className="px-1 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  {d.label}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {SESIONES.map((s) => {
                    const datos = resumenPorTurno.get(`${d.value}|${s}`)
                    return (
                      <div
                        key={s}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {SESION_LABEL[s]}
                        </p>
                        <p className="mt-3 font-serif text-3xl tabular-nums text-foreground">
                          {datos?.asistencia ?? 0}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Desglose con barra de filtro por día y turno */}
        <section className="mt-10">
          <h2 className="font-serif text-xl text-foreground">Desglose</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Asistencia por área. Filtra por día y turno.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {DIAS.map((d) => (
                <Chip
                  key={d.value}
                  label={d.label}
                  active={diaFiltro === d.value}
                  onClick={() => setDiaFiltro(d.value)}
                />
              ))}
            </div>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {SESIONES.map((s) => (
                <Chip
                  key={s}
                  label={SESION_LABEL[s]}
                  active={turnoFiltro === s}
                  onClick={() => setTurnoFiltro(s)}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Capacidad</TableHead>
                  <TableHead className="text-right">Asistencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Sin asistencia registrada para este turno.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filas.map((f) => (
                      <TableRow key={f.key}>
                        <TableCell className="text-muted-foreground">
                          {formatDia(f.dia)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {SESION_LABEL[f.sesion]}
                        </TableCell>
                        <TableCell className="font-medium">
                          {f.areaNombre}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {f.modo === "vacios" ? f.capacidad : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {f.asistencia}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40">
                      <TableCell className="font-medium" colSpan={4}>
                        Total
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {totalFiltrado}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Vista de solo lectura · se actualiza sola cada pocos segundos.
        </p>
      </div>
    </main>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      {label}
    </button>
  )
}

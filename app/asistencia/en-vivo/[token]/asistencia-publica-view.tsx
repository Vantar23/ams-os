"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RadioIcon } from "lucide-react"

import {
  ResumenAsistencia,
  TurnoResumenGrid,
} from "@/app/(app)/asistencia/turno-resumen"
import {
  computeResumenRows,
  reporteToConteo,
  type Area,
  type Conteo,
  type Reporte,
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

  const totalGeneral = resumenRows.reduce((s, r) => s + r.asistencia, 0)

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
        <section>
          <h2 className="font-serif text-xl text-foreground">
            Resumen por turno
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Asistencia total de cada turno, según los conteos validados. Se
            actualiza automáticamente.
          </p>
          <div className="mt-4">
            <TurnoResumenGrid areas={areas} conteos={conteos} />
          </div>
        </section>

        <div className="mt-8">
          <ResumenAsistencia rows={resumenRows} />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Vista de solo lectura · se actualiza sola cada pocos segundos.
        </p>
      </div>
    </main>
  )
}

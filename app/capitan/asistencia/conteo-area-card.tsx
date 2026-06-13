"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertTriangleIcon, CheckIcon, MinusIcon, PlusIcon } from "lucide-react"

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
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadDia,
  type DisponibilidadSesion,
} from "@/lib/disponibilidad"

import type { ReporteAcomodador } from "../load"

import { reportarConteoCapitan } from "./actions"

export type ConteoVigente = {
  valor: number
  reportadoAt: string
  /** Nombre del capitán que mandó el reporte vigente, si no fuiste tú. */
  reportadoPorOtro: string | null
}

function defaultDia(): DisponibilidadDia {
  const weekday = new Date().getDay()
  if (weekday === 6) return "sabado"
  if (weekday === 0) return "domingo"
  return "viernes"
}

function defaultSesion(): DisponibilidadSesion {
  return new Date().getHours() < 14 ? "manana" : "tarde"
}

function formatReportado(reportadoAt: string | null): string {
  if (!reportadoAt) return ""
  try {
    return new Date(reportadoAt).toLocaleString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    })
  } catch {
    return ""
  }
}

/**
 * Tarjeta de conteo de un área del capitán: elige día y sesión, y reporta el
 * conteo con el mismo contador que usan los acomodadores.
 */
export function ConteoAreaCard({
  area,
  vigentes,
  reportesPorSlot,
}: {
  area: {
    id: string
    nombre: string
    piso: string
    capacidad: number
    filas: number
  }
  vigentes: Record<string, ConteoVigente>
  reportesPorSlot: Record<string, ReporteAcomodador[]>
}) {
  const [dia, setDia] = React.useState<DisponibilidadDia>(() => defaultDia())
  const [sesion, setSesion] = React.useState<DisponibilidadSesion>(() =>
    defaultSesion(),
  )
  const slot = `${dia}-${sesion}`
  const vigente = vigentes[slot] ?? null
  const reportes = reportesPorSlot[slot] ?? []

  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-base font-medium text-foreground">{area.nombre}</p>
      <p className="text-xs text-muted-foreground">
        {area.piso}
        {area.capacidad > 0 && ` · cap. ${area.capacidad}`}
        {area.filas > 0 && ` · ${area.filas} filas`}
      </p>

      <div className="mt-4 grid gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Día
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {DISPONIBILIDAD_DIAS.map((d) => (
              <Button
                key={d.key}
                type="button"
                variant={dia === d.key ? "default" : "outline"}
                onClick={() => setDia(d.key)}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Sesión
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DISPONIBILIDAD_SESIONES.map((s) => (
              <Button
                key={s.key}
                type="button"
                variant={sesion === s.key ? "default" : "outline"}
                onClick={() => setSesion(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ContadorForm
        key={slot}
        areaId={area.id}
        slot={slot}
        areaCapacidad={area.capacidad}
        initialValor={vigente?.valor ?? null}
        reportadoAt={vigente?.reportadoAt ?? null}
        reportadoPorOtro={vigente?.reportadoPorOtro ?? null}
        reportes={reportes}
      />
    </div>
  )
}

/** El mismo contador del portal de acomodadores, reportando vía RPC de capitán. */
function ContadorForm({
  areaId,
  slot,
  areaCapacidad,
  initialValor,
  reportadoAt,
  reportadoPorOtro,
  reportes,
}: {
  areaId: string
  slot: string
  areaCapacidad: number
  initialValor: number | null
  reportadoAt: string | null
  reportadoPorOtro: string | null
  reportes: ReporteAcomodador[]
}) {
  const router = useRouter()
  const modo: "vacios" | "asistentes" =
    areaCapacidad > 0 ? "vacios" : "asistentes"
  const [valor, setValor] = React.useState<number>(initialValor ?? 0)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savedLabel, setSavedLabel] = React.useState<string | null>(null)
  const [lastReportado, setLastReportado] = React.useState<string | null>(
    reportadoAt,
  )
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  function bump(delta: number) {
    setValor((v) => {
      const next = v + delta
      if (next < 0) return 0
      if (modo === "vacios" && next > areaCapacidad) return areaCapacidad
      return next
    })
  }

  function setFromInput(raw: string) {
    const n = Number.parseInt(raw, 10)
    if (Number.isNaN(n) || n < 0) {
      setValor(0)
      return
    }
    if (modo === "vacios" && n > areaCapacidad) {
      setValor(areaCapacidad)
      return
    }
    setValor(n)
  }

  function usarValor(n: number) {
    if (!Number.isFinite(n) || n < 0) return setValor(0)
    if (modo === "vacios" && n > areaCapacidad) return setValor(areaCapacidad)
    setValor(n)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setConfirmOpen(true)
  }

  async function confirmarReporte() {
    setConfirmOpen(false)
    setSubmitting(true)
    setError(null)
    setSavedLabel(null)
    const { ok, error: err } = await reportarConteoCapitan({
      areaId,
      slot,
      valor,
    })
    setSubmitting(false)
    if (!ok) {
      setError(err)
      return
    }
    setLastReportado(new Date().toISOString())
    setSavedLabel("Reportado")
    setTimeout(() => setSavedLabel(null), 2500)
    router.refresh()
  }

  const asistencia =
    modo === "asistentes" ? valor : Math.max(0, areaCapacidad - valor)
  const valorAnterior = initialValor
  const valorCambia = valorAnterior !== null && valorAnterior !== valor

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4">
      {reportadoPorOtro && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">{reportadoPorOtro}</span> ya reportó la
            asistencia de esta sesión
            {lastReportado ? ` (${formatReportado(lastReportado)})` : ""}. Si
            reportas, sobrescribirás su conteo.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Lo que anotaron tus acomodadores
        </p>
        {reportes.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Aún sin reportes para esta sesión.
          </p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {reportes.map((r, i) => (
              <li
                key={`${r.acomodadorNombre}-${r.reportadoAt}-${i}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {r.acomodadorNombre}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatReportado(r.reportadoAt)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {modo === "vacios"
                    ? `${r.valor} vacíos`
                    : `${r.valor} asist.`}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => usarValor(r.valor)}
                  className="h-7 shrink-0 px-2 text-xs"
                >
                  Usar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {modo === "vacios" ? "Lugares vacíos" : "Asistentes contados"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {modo === "vacios"
            ? `Se restarán a la capacidad (${areaCapacidad}) del área.`
            : "Sin capacidad fija — registra el conteo de personas."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => bump(-1)}
          disabled={valor <= 0 || submitting}
          aria-label="Restar uno"
          className="size-14 shrink-0 rounded-full p-0"
        >
          <MinusIcon className="size-6" />
        </Button>

        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={0}
          max={modo === "vacios" ? areaCapacidad : undefined}
          value={valor}
          onChange={(e) => setFromInput(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full min-w-0 rounded-lg border border-border bg-background py-3 text-center text-5xl font-semibold tabular-nums tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={modo === "vacios" ? "Lugares vacíos" : "Asistentes"}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => bump(1)}
          disabled={submitting || (modo === "vacios" && valor >= areaCapacidad)}
          aria-label="Sumar uno"
          className="size-14 shrink-0 rounded-full p-0"
        >
          <PlusIcon className="size-6" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[-10, -5, +5, +10].map((delta) => (
          <Button
            key={delta}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => bump(delta)}
            disabled={
              submitting ||
              (delta < 0 && valor <= 0) ||
              (modo === "vacios" && delta > 0 && valor >= areaCapacidad)
            }
            className="tabular-nums"
          >
            {delta > 0 ? `+${delta}` : delta}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Asistencia calculada
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
          {asistencia}
        </p>
        {modo === "vacios" && (
          <p className="text-[11px] text-muted-foreground">
            de {areaCapacidad}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="h-12 w-full text-base"
      >
        {submitting ? "Guardando…" : "Reportar"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {savedLabel ? (
          <span className="inline-flex items-center gap-1 text-primary">
            <CheckIcon className="size-3.5" />
            {savedLabel}
          </span>
        ) : lastReportado ? (
          `Último reporte: ${formatReportado(lastReportado)}`
        ) : (
          "Aún no reportado en esta sesión"
        )}
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {valorCambia ? "Cambiar reporte" : "Confirmar reporte"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {reportadoPorOtro && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-400">
                    <span className="font-medium">{reportadoPorOtro}</span> ya
                    reportó esta sesión. Vas a sobrescribir su conteo.
                  </p>
                )}
                <p>
                  {valorCambia
                    ? "Vas a sobrescribir el último reporte de esta sesión. Revisa los números antes de confirmar."
                    : "Revisa los números antes de confirmar."}
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {modo === "vacios" ? "Lugares vacíos" : "Asistentes"}
                    </span>
                    <span className="font-medium tabular-nums">{valor}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Asistencia calculada
                    </span>
                    <span className="font-medium tabular-nums">
                      {asistencia}
                      {modo === "vacios" && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          de {areaCapacidad}
                        </span>
                      )}
                    </span>
                  </div>
                  {valorCambia && valorAnterior !== null && (
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Valor anterior</span>
                      <span className="tabular-nums">{valorAnterior}</span>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver a contar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarReporte}>
              Confirmar y reportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

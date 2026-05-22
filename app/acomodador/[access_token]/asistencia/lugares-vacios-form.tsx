"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react"

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

import { reportarLugaresVacios } from "../actions"

function formatReportado(reportadoAt: string | null): string {
  if (!reportadoAt) return ""
  try {
    const d = new Date(reportadoAt)
    return d.toLocaleString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    })
  } catch {
    return ""
  }
}

export function LugaresVaciosForm({
  accessToken,
  asignacionId,
  areaCapacidad,
  initialLugares,
  reportadoAt,
}: {
  accessToken: string
  asignacionId: string
  areaCapacidad: number
  initialLugares: number | null
  reportadoAt: string | null
}) {
  const router = useRouter()
  const modo: "vacios" | "asistentes" = areaCapacidad > 0 ? "vacios" : "asistentes"
  const [valor, setValor] = React.useState<number>(initialLugares ?? 0)
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
    const { ok, error: err } = await reportarLugaresVacios({
      accessToken,
      asignacionId,
      lugares: valor,
    })
    setSubmitting(false)
    if (!ok) {
      setError(err)
      return
    }
    const now = new Date().toISOString()
    setLastReportado(now)
    setSavedLabel("Reportado")
    setTimeout(() => setSavedLabel(null), 2500)
    router.refresh()
  }

  const asistencia =
    modo === "asistentes" ? valor : Math.max(0, areaCapacidad - valor)

  const asistenciaSiConfirma = asistencia
  const valorAnterior = initialLugares
  const valorCambia = valorAnterior !== null && valorAnterior !== valor

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4">
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
          disabled={
            submitting || (modo === "vacios" && valor >= areaCapacidad)
          }
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
          "Aún no reportado"
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
                <p>
                  {valorCambia
                    ? "Vas a sobrescribir tu último reporte. Revisa los números antes de confirmar."
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
                      {asistenciaSiConfirma}
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

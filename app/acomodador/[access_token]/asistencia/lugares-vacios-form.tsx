"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  initialLugares,
  reportadoAt,
}: {
  accessToken: string
  asignacionId: string
  initialLugares: number | null
  reportadoAt: string | null
}) {
  const router = useRouter()
  const [valor, setValor] = React.useState<number>(initialLugares ?? 0)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savedLabel, setSavedLabel] = React.useState<string | null>(null)
  const [lastReportado, setLastReportado] = React.useState<string | null>(
    reportadoAt,
  )

  function bump(delta: number) {
    setValor((v) => Math.max(0, v + delta))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3">
      <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
        Lugares vacíos
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => bump(-1)}
          disabled={valor <= 0 || submitting}
          aria-label="Restar"
        >
          <MinusIcon />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={valor}
          onChange={(e) => {
            const n = Number(e.target.value)
            setValor(Number.isFinite(n) && n >= 0 ? n : 0)
          }}
          className="text-center text-lg font-semibold tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => bump(1)}
          disabled={submitting}
          aria-label="Sumar"
        >
          <PlusIcon />
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
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
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Reportar"}
        </Button>
      </div>
    </form>
  )
}

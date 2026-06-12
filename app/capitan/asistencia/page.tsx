import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { createClient } from "@/lib/supabase/server"

import { loadAreasDelCapitan, loadCapitanActual } from "../load"

import { ConteoAreaCard, type ConteoVigente } from "./conteo-area-card"

export default async function Page() {
  const actual = await loadCapitanActual()
  if (!actual) redirect("/acomodadores")
  const { capitan, asamblea } = actual

  const areas = await loadAreasDelCapitan(asamblea.id, capitan.area)

  // Conteo vigente por área+slot: la fila más reciente de conteos_capitan.
  const vigentesPorArea = new Map<string, Record<string, ConteoVigente>>()
  if (areas.length > 0) {
    const supabase = await createClient()
    const { data: conteos } = await supabase
      .from("conteos_capitan")
      .select("area_id, slot, valor, reportado_at")
      .eq("asamblea_id", asamblea.id)
      .in(
        "area_id",
        areas.map((a) => a.id),
      )
      .order("reportado_at", { ascending: false })
    for (const c of (conteos ?? []) as {
      area_id: string
      slot: string
      valor: number
      reportado_at: string
    }[]) {
      const porSlot = vigentesPorArea.get(c.area_id) ?? {}
      if (!(c.slot in porSlot)) {
        porSlot[c.slot] = { valor: c.valor, reportadoAt: c.reportado_at }
        vigentesPorArea.set(c.area_id, porSlot)
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-5 sm:py-14">
      <Link
        href="/capitan"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[1.75rem] leading-[1.15] text-foreground sm:text-4xl sm:leading-tight">
        Asistencia
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reporta el conteo de tus áreas asignadas. Elige el día y la sesión, y
        administración lo verá en tiempo real.
      </p>

      {areas.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          Aún no tienes áreas asignadas. Cuando administración te asigne un
          área, aparecerá aquí.
        </p>
      ) : (
        <div className="mt-6 grid gap-3">
          {areas.map((a) => (
            <ConteoAreaCard
              key={a.id}
              area={a}
              vigentes={vigentesPorArea.get(a.id) ?? {}}
            />
          ))}
        </div>
      )}
    </main>
  )
}

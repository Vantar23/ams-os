import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import {
  AsistenciaClient,
  type Area,
  type HistorialEntry,
  type Reporte,
} from "./asistencia-client"

export default async function AsistenciaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .order("created_at", { ascending: false })
    .limit(1)

  const asamblea = asambleas?.[0]

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Reportes" title="Asistencia" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a registrar asistencia.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  // Si quien entra es un capitán, restringimos la vista a sus áreas
  // asignadas y sus conteos se guardan en la base (no en este dispositivo).
  let capitanAreaLabels: string[] | null = null
  if (user) {
    const [{ data: miembro }, { data: capitanRow }] = await Promise.all([
      supabase
        .from("asamblea_miembros")
        .select("role")
        .eq("asamblea_id", asamblea.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("capitanes")
        .select("area")
        .eq("asamblea_id", asamblea.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ])
    if (miembro?.role === "capitan") {
      capitanAreaLabels = ((capitanRow?.area as string[] | null) ?? []) as string[]
    }
  }

  const { data: areasRaw } = await supabase
    .from("areas")
    .select("id, piso, nombre, capacidad")
    .eq("asamblea_id", asamblea.id)
    .order("piso", { ascending: true })
    .order("nombre", { ascending: true })

  const areas = (
    (areasRaw ?? []) as { id: string; piso: string; nombre: string; capacidad: number }[]
  ).filter(
    (a) =>
      capitanAreaLabels === null ||
      capitanAreaLabels.includes(`${a.piso} — ${a.nombre}`),
  )
  const areaIdsVisibles = new Set(areas.map((a) => a.id))

  const { data: reportesRaw } = await supabase
    .from("asignaciones")
    .select(
      "id, slot, lugares_vacios, reportado_at, area_id, acomodador_id, areas(nombre, capacidad), acomodadores(nombre, apellido)",
    )
    .eq("asamblea_id", asamblea.id)
    .not("lugares_vacios", "is", null)
    .order("reportado_at", { ascending: false })

  type Row = {
    id: string
    slot: string
    lugares_vacios: number
    reportado_at: string
    area_id: string
    acomodador_id: string
    areas:
      | { nombre: string; capacidad: number }
      | { nombre: string; capacidad: number }[]
      | null
    acomodadores:
      | { nombre: string; apellido: string }
      | { nombre: string; apellido: string }[]
      | null
  }
  function first<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
  }
  const reportes: Reporte[] = ((reportesRaw ?? []) as unknown as Row[])
    .filter((r) => capitanAreaLabels === null || areaIdsVisibles.has(r.area_id))
    .map((r) => {
      const area = first(r.areas)
      const ac = first(r.acomodadores)
      return {
        id: r.id,
        slot: r.slot,
        valor: r.lugares_vacios,
        reportadoAt: r.reportado_at,
        areaId: r.area_id,
        areaNombre: area?.nombre ?? "—",
        areaCapacidad: area?.capacidad ?? 0,
        acomodadorNombre: ac ? `${ac.nombre} ${ac.apellido}`.trim() : "—",
        fuente: "acomodador",
      }
    })

  // Conteos reportados por capitanes (append-only): se toma el más reciente
  // por capitán+área+slot y entra a la misma lista que los de acomodadores.
  const { data: conteosCapRaw } = await supabase
    .from("conteos_capitan")
    .select(
      "id, slot, valor, reportado_at, area_id, capitan_id, areas(nombre, capacidad), capitanes(nombre, apellido)",
    )
    .eq("asamblea_id", asamblea.id)
    .order("reportado_at", { ascending: false })

  type ConteoCapRow = {
    id: string
    slot: string
    valor: number
    reportado_at: string
    area_id: string
    capitan_id: string
    areas: { nombre: string; capacidad: number } | { nombre: string; capacidad: number }[] | null
    capitanes: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null
  }
  const vistosCap = new Set<string>()
  for (const c of (conteosCapRaw ?? []) as unknown as ConteoCapRow[]) {
    if (capitanAreaLabels !== null && !areaIdsVisibles.has(c.area_id)) continue
    const clave = `${c.capitan_id}|${c.area_id}|${c.slot}`
    if (vistosCap.has(clave)) continue
    vistosCap.add(clave)
    const area = first(c.areas)
    const cap = first(c.capitanes)
    reportes.push({
      id: c.id,
      slot: c.slot,
      valor: c.valor,
      reportadoAt: c.reportado_at,
      areaId: c.area_id,
      areaNombre: area?.nombre ?? "—",
      areaCapacidad: area?.capacidad ?? 0,
      acomodadorNombre: cap
        ? `${cap.nombre} ${cap.apellido} · Capitán`.trim()
        : "Capitán",
      fuente: "capitan",
    })
  }

  const { data: historialRaw } = await supabase
    .from("asistencia_historial")
    .select(
      "id, asignacion_id, lugares_vacios, origen, reportado_at, reportado_por_acomodador_id, reportado_por_user_id, revert_from_id, acomodadores(nombre, apellido)",
    )
    .eq("asamblea_id", asamblea.id)
    .order("reportado_at", { ascending: false })

  type HistRow = {
    id: string
    asignacion_id: string
    lugares_vacios: number
    origen: "acomodador" | "admin" | "revert"
    reportado_at: string
    reportado_por_acomodador_id: string | null
    reportado_por_user_id: string | null
    revert_from_id: string | null
    acomodadores:
      | { nombre: string; apellido: string }
      | { nombre: string; apellido: string }[]
      | null
  }
  function firstHist<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
  }
  const historial: HistorialEntry[] = (
    (historialRaw ?? []) as unknown as HistRow[]
  ).map((h) => {
    const ac = firstHist(h.acomodadores)
    return {
      id: h.id,
      asignacionId: h.asignacion_id,
      valor: h.lugares_vacios,
      origen: h.origen,
      reportadoAt: h.reportado_at,
      reportadoPor: ac
        ? `${ac.nombre} ${ac.apellido}`.trim()
        : h.reportado_por_user_id
          ? "Admin"
          : "—",
      esRevert: h.revert_from_id !== null,
    }
  })

  return (
    <>
      <PageHeader parent="Reportes" title="Asistencia" />
      <AsistenciaClient
        areas={areas as Area[]}
        reportes={reportes}
        historial={historial}
        capitanMode={capitanAreaLabels !== null}
      />
    </>
  )
}

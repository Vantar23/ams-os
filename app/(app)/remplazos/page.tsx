import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { slotLabelCorto } from "@/lib/disponibilidad"
import { createClient } from "@/lib/supabase/server"

import {
  RemplazosClient,
  type Candidato,
  type Pendiente,
  type RegistroReemplazo,
} from "./remplazos-client"

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

export default async function RemplazosPage() {
  const supabase = await createClient()

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .order("created_at", { ascending: false })
    .limit(1)
  const asamblea = asambleas?.[0]

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Asignaciones" title="Remplazos" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para gestionar reemplazos.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const [
    { data: pendientesRaw },
    { data: acomodadores },
    { data: asignaciones },
    { data: areas },
    { data: historialRaw },
  ] = await Promise.all([
    supabase
      .from("asignaciones")
      .select(
        "id, area_id, slot, asistencia_at, acomodadores(nombre, apellido, congregacion, telefono)",
      )
      .eq("asamblea_id", asamblea.id)
      .eq("asistencia", "necesita_remplazo"),
    supabase
      .from("acomodadores")
      .select("id, nombre, apellido, congregacion, telefono, disponibilidad")
      .eq("asamblea_id", asamblea.id)
      .order("nombre", { ascending: true }),
    supabase
      .from("asignaciones")
      .select("acomodador_id, slot")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("areas")
      .select("id, piso, nombre")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("reemplazos")
      .select("id, slot, created_at, area_id, saliente_id, entrante_id")
      .eq("asamblea_id", asamblea.id)
      .order("created_at", { ascending: false }),
  ])

  const areaNombreById = new Map(
    ((areas ?? []) as { id: string; piso: string; nombre: string }[]).map((a) => [
      a.id,
      a.nombre,
    ]),
  )

  type PendienteRow = {
    id: string
    area_id: string
    slot: string
    asistencia_at: string | null
    acomodadores:
      | { nombre: string; apellido: string; congregacion: string; telefono: string | null }
      | { nombre: string; apellido: string; congregacion: string; telefono: string | null }[]
      | null
  }

  const pendientes: Pendiente[] = ((pendientesRaw ?? []) as unknown as PendienteRow[])
    .map((r) => {
      const ac = first(r.acomodadores)
      const areaNombre = areaNombreById.get(r.area_id)
      return {
        asignacionId: r.id,
        nombre: ac ? `${ac.nombre} ${ac.apellido}`.trim() : "—",
        congregacion: ac?.congregacion ?? "",
        slot: r.slot,
        puesto: areaNombre
          ? `${areaNombre} · ${slotLabelCorto(r.slot)}`
          : slotLabelCorto(r.slot),
        marcadoAt: r.asistencia_at,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Acomodadores ya con puesto en cada turno, para avisar en la lista.
  const ocupadosPorSlot = new Map<string, Set<string>>()
  for (const a of (asignaciones ?? []) as { acomodador_id: string; slot: string }[]) {
    const set = ocupadosPorSlot.get(a.slot) ?? new Set<string>()
    set.add(a.acomodador_id)
    ocupadosPorSlot.set(a.slot, set)
  }

  const candidatos: Candidato[] = (
    (acomodadores ?? []) as {
      id: string
      nombre: string
      apellido: string
      congregacion: string
      telefono: string | null
      disponibilidad: string[] | null
    }[]
  ).map((a) => ({
    id: a.id,
    nombre: `${a.nombre} ${a.apellido}`.trim(),
    congregacion: a.congregacion,
    disponibilidad: a.disponibilidad ?? [],
    ocupadoEn: Object.fromEntries(
      [...ocupadosPorSlot.entries()]
        .filter(([, set]) => set.has(a.id))
        .map(([slot]) => [slot, true]),
    ),
  }))

  // Nombres por id, reutilizando la lista completa de acomodadores ya cargada.
  const nombreById = new Map(
    (
      (acomodadores ?? []) as { id: string; nombre: string; apellido: string }[]
    ).map((a) => [a.id, `${a.nombre} ${a.apellido}`.trim()]),
  )

  type HistRow = {
    id: string
    slot: string
    created_at: string
    area_id: string
    saliente_id: string
    entrante_id: string
  }

  const historial: RegistroReemplazo[] = (
    (historialRaw ?? []) as HistRow[]
  ).map((r) => {
    const areaNombre = areaNombreById.get(r.area_id)
    return {
      id: r.id,
      saliente: nombreById.get(r.saliente_id) ?? "—",
      entrante: nombreById.get(r.entrante_id) ?? "—",
      puesto: areaNombre
        ? `${areaNombre} · ${slotLabelCorto(r.slot)}`
        : slotLabelCorto(r.slot),
      createdAt: r.created_at,
    }
  })

  return (
    <>
      <PageHeader parent="Asignaciones" title="Remplazos" />
      <RemplazosClient
        asamblea={asamblea}
        pendientes={pendientes}
        candidatos={candidatos}
        historial={historial}
      />
    </>
  )
}

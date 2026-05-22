import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { AsistenciaClient, type Area, type Reporte } from "./asistencia-client"

export default async function AsistenciaPage() {
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

  const { data: areas } = await supabase
    .from("areas")
    .select("id, piso, nombre, capacidad")
    .eq("asamblea_id", asamblea.id)
    .order("piso", { ascending: true })
    .order("nombre", { ascending: true })

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
  const reportes: Reporte[] = ((reportesRaw ?? []) as unknown as Row[]).map(
    (r) => {
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
      }
    },
  )

  return (
    <>
      <PageHeader parent="Reportes" title="Asistencia" />
      <AsistenciaClient
        areas={(areas ?? []) as Area[]}
        reportes={reportes}
      />
    </>
  )
}

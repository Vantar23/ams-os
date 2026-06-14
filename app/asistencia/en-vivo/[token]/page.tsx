import { createAdminClient } from "@/lib/supabase/admin"
import type { Area, Reporte } from "@/lib/asistencia"

import { AsistenciaPublicaView } from "./asistencia-publica-view"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Datos siempre frescos: la vista pública refleja la asistencia en vivo.
export const dynamic = "force-dynamic"
export const revalidate = 0

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function NoEncontrada() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">
          Enlace no válido
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Este enlace de asistencia no existe o ya no está disponible.
        </p>
      </div>
    </main>
  )
}

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!UUID_RE.test(token)) return <NoEncontrada />

  const admin = createAdminClient()

  const { data: asamblea } = await admin
    .from("asambleas")
    .select("id, numero, edicion, titulo, fechas, sede")
    .eq("asistencia_share_token", token)
    .maybeSingle()

  if (!asamblea) return <NoEncontrada />

  const asambleaId = asamblea.id as string

  const [{ data: areasRaw }, { data: asignacionesRaw }, { data: conteosCapRaw }] =
    await Promise.all([
      admin
        .from("areas")
        .select("id, piso, nombre, capacidad")
        .eq("asamblea_id", asambleaId)
        .order("piso", { ascending: true })
        .order("nombre", { ascending: true }),
      admin
        .from("asignaciones")
        .select(
          "id, slot, lugares_vacios, reportado_at, area_id, areas(nombre, capacidad), acomodadores(nombre, apellido)",
        )
        .eq("asamblea_id", asambleaId)
        .not("lugares_vacios", "is", null)
        .order("reportado_at", { ascending: false }),
      admin
        .from("conteos_capitan")
        .select(
          "id, slot, valor, reportado_at, area_id, areas(nombre, capacidad), capitanes(nombre, apellido)",
        )
        .eq("asamblea_id", asambleaId)
        .order("reportado_at", { ascending: false }),
    ])

  const areas = (areasRaw ?? []) as Area[]

  type AsigRow = {
    id: string
    slot: string
    lugares_vacios: number
    reportado_at: string
    area_id: string
    areas:
      | { nombre: string; capacidad: number }
      | { nombre: string; capacidad: number }[]
      | null
    acomodadores:
      | { nombre: string; apellido: string }
      | { nombre: string; apellido: string }[]
      | null
  }
  const reportes: Reporte[] = ((asignacionesRaw ?? []) as unknown as AsigRow[]).map(
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
        fuente: "acomodador",
      }
    },
  )

  type ConteoCapRow = {
    id: string
    slot: string
    valor: number
    reportado_at: string
    area_id: string
    areas:
      | { nombre: string; capacidad: number }
      | { nombre: string; capacidad: number }[]
      | null
    capitanes:
      | { nombre: string; apellido: string }
      | { nombre: string; apellido: string }[]
      | null
  }
  const vistosCap = new Set<string>()
  for (const c of (conteosCapRaw ?? []) as unknown as ConteoCapRow[]) {
    const clave = `${c.area_id}|${c.slot}`
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

  return (
    <AsistenciaPublicaView
      asamblea={{
        numero: String(asamblea.numero ?? ""),
        edicion: String(asamblea.edicion ?? ""),
        sede: String(asamblea.sede ?? ""),
        fechas: String(asamblea.fechas ?? ""),
      }}
      areas={areas}
      reportes={reportes}
    />
  )
}

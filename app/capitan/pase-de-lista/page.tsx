import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import {
  DISPONIBILIDAD_SLOTS,
  momentoEnRecinto,
  slotLabelCorto,
  slotsVisibles,
} from "@/lib/disponibilidad"
import { createClient } from "@/lib/supabase/server"

import { loadAreasDelCapitan, loadCapitanActual } from "../load"

import { ListaPase, type ItemPase } from "./lista-pase"

export default async function Page() {
  const actual = await loadCapitanActual()
  if (!actual) redirect("/acomodadores")
  const { capitan, asamblea } = actual

  // Mismos puestos que "Mis acomodadores": asignaciones en las áreas del
  // capitán para el turno vigente.
  const areasDelCapitan = await loadAreasDelCapitan(asamblea.id, capitan.area)
  const areaNombreById = new Map(areasDelCapitan.map((a) => [a.id, a.nombre]))
  const areaIds = areasDelCapitan.map((a) => a.id)

  const supabase = await createClient()
  const { data: asignaciones } = areaIds.length
    ? await supabase
        .from("asignaciones")
        .select(
          "id, acomodador_id, area_id, slot, asistencia, acomodadores(nombre, apellido, congregacion, telefono)",
        )
        .eq("asamblea_id", asamblea.id)
        .in("area_id", areaIds)
    : { data: [] }

  const slotsVigentes = new Set(
    slotsVisibles(DISPONIBILIDAD_SLOTS, momentoEnRecinto()),
  )

  type Row = {
    id: string
    acomodador_id: string
    area_id: string
    slot: string
    asistencia: "presente" | "necesita_remplazo" | null
    acomodadores:
      | { nombre: string; apellido: string; congregacion: string; telefono: string | null }
      | { nombre: string; apellido: string; congregacion: string; telefono: string | null }[]
      | null
  }
  const first = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const items: ItemPase[] = ((asignaciones ?? []) as unknown as Row[])
    .filter((r) => slotsVigentes.has(r.slot))
    .map((r) => {
      const ac = first(r.acomodadores)
      const areaNombre = areaNombreById.get(r.area_id) ?? ""
      return {
        asignacionId: r.id,
        nombre: ac ? `${ac.nombre} ${ac.apellido}`.trim() : "—",
        congregacion: ac?.congregacion ?? "",
        puesto: `${areaNombre} · ${slotLabelCorto(r.slot)}`,
        telefono: ac?.telefono ?? null,
        asistencia: r.asistencia,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <Link
        href="/capitan"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Mis acomodadores
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tu equipo en el turno vigente: contáctalos y marca quién se presentó. Si
        alguien no llegó, márcalo como “Necesita reemplazo” y administración le
        asignará un sustituto.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          {capitan.area.length === 0
            ? "Tu ficha aún no tiene un área asignada; pídele a administración que te asigne una."
            : "Nadie tiene puesto asignado en tu área para el turno vigente."}
        </p>
      ) : (
        <ListaPase items={items} />
      )}
    </main>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { slotLabelCorto } from "@/lib/disponibilidad"
import { formatPhoneDisplay, normalizePhone } from "@/lib/phone"
import { createClient } from "@/lib/supabase/server"

import { WhatsappIcon } from "@/components/whatsapp-icon"

import { loadAreasDelCapitan, loadCapitanActual } from "../load"

export default async function Page() {
  const actual = await loadCapitanActual()
  if (!actual) redirect("/acomodadores")
  const { capitan, asamblea } = actual

  // El equipo del capitán son los acomodadores con un puesto asignado en sus
  // áreas (tabla asignaciones), no los que él haya registrado.
  const areasDelCapitan = await loadAreasDelCapitan(asamblea.id, capitan.area)
  const areaNombreById = new Map(areasDelCapitan.map((a) => [a.id, a.nombre]))
  const areaIds = areasDelCapitan.map((a) => a.id)

  const supabase = await createClient()
  const { data: asignaciones } = areaIds.length
    ? await supabase
        .from("asignaciones")
        .select("acomodador_id, area_id, slot")
        .eq("asamblea_id", asamblea.id)
        .in("area_id", areaIds)
    : { data: [] }

  const puestosPorAcomodador = new Map<string, string[]>()
  for (const a of asignaciones ?? []) {
    const areaNombre = areaNombreById.get(a.area_id as string)
    if (!areaNombre) continue
    const list = puestosPorAcomodador.get(a.acomodador_id as string) ?? []
    list.push(`${areaNombre} · ${slotLabelCorto(a.slot as string)}`)
    puestosPorAcomodador.set(a.acomodador_id as string, list)
  }

  const acomodadorIds = Array.from(puestosPorAcomodador.keys())
  const { data: acomodadores } = acomodadorIds.length
    ? await supabase
        .from("acomodadores")
        .select("id, nombre, apellido, congregacion, telefono")
        .in("id", acomodadorIds)
        .order("nombre", { ascending: true })
    : { data: [] }

  const lista = (acomodadores ?? []) as {
    id: string
    nombre: string
    apellido: string
    congregacion: string
    telefono: string | null
  }[]

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
        Los acomodadores asignados a tu área. Tócales para llamarles o
        escribirles por WhatsApp.
      </p>

      {lista.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          {capitan.area.length === 0
            ? "Tu ficha aún no tiene un área asignada; pídele a administración que te asigne una."
            : "Aún no hay acomodadores con puesto asignado en tu área."}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {lista.map((a) => {
            const digits = a.telefono ? normalizePhone(a.telefono) : ""
            const puestos = puestosPorAcomodador.get(a.id) ?? []
            return (
              <li key={a.id} className="rounded-xl border bg-surface p-4">
                <p className="text-base font-medium text-foreground">
                  {a.nombre} {a.apellido}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.congregacion}
                  {digits && ` · ${formatPhoneDisplay(digits)}`}
                </p>
                {puestos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {puestos.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        <MapPinIcon className="size-3" />
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                {digits && (
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`tel:${digits}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      <PhoneIcon className="size-3.5" />
                      Llamar
                    </a>
                    <a
                      href={`https://wa.me/52${digits}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-600/15 dark:text-emerald-400"
                    >
                      <WhatsappIcon className="size-3.5" />
                      WhatsApp
                    </a>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

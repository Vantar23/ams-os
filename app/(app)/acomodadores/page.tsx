import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import type { PuestosPorPersona } from "@/components/puestos-asignados"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { AcomodadoresClient } from "./acomodadores-client"

export default async function AcomodadoresPage() {
  const supabase = await createClient()

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id, numero, edicion, titulo")
    .order("created_at", { ascending: false })
    .limit(1)

  const asamblea = asambleas?.[0]

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Personal" title="Acomodadores" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a registrar acomodadores.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: acomodadores },
    { data: capitanes },
    { data: myCapitan },
    { data: areas },
    { data: asignaciones },
  ] = await Promise.all([
    supabase
      .from("acomodadores")
      .select(
        "id, nombre, apellido, congregacion, telefono, notas, access_token, device_bound_at, created_at, capitan_id, disponibilidad",
      )
      .eq("asamblea_id", asamblea.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("capitanes")
      .select("id, nombre, apellido, area")
      .eq("asamblea_id", asamblea.id)
      .order("nombre", { ascending: true }),
    user
      ? supabase
          .from("capitanes")
          .select("id")
          .eq("asamblea_id", asamblea.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("areas")
      .select("id, nombre")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("asignaciones")
      .select("acomodador_id, area_id, slot")
      .eq("asamblea_id", asamblea.id),
  ])

  const areaNombreById = new Map(
    (areas ?? []).map((a) => [a.id as string, a.nombre as string]),
  )
  const puestosPorAcomodador: PuestosPorPersona = {}
  for (const a of asignaciones ?? []) {
    const areaNombre = areaNombreById.get(a.area_id as string)
    if (!areaNombre) continue
    const list = (puestosPorAcomodador[a.acomodador_id as string] ??= [])
    list.push({ areaNombre, slot: a.slot as string })
  }

  return (
    <>
      <PageHeader parent="Personal" title="Acomodadores" />
      <AcomodadoresClient
        asamblea={asamblea}
        acomodadores={acomodadores ?? []}
        capitanes={capitanes ?? []}
        currentCapitanId={(myCapitan?.id as string | undefined) ?? null}
        puestos={puestosPorAcomodador}
      />
    </>
  )
}

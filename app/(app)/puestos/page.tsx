import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { PuestosClient } from "./puestos-client"

export default async function PuestosPage() {
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
        <PageHeader parent="Asignaciones" title="Puestos" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a asignar puestos.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const [{ data: areas }, { data: acomodadores }, { data: asignaciones }] =
    await Promise.all([
      supabase
        .from("areas")
        .select(
          "id, piso, nombre, filas, acomodadores_necesarios, capacidad",
        )
        .eq("asamblea_id", asamblea.id)
        .order("piso", { ascending: true })
        .order("nombre", { ascending: true }),
      supabase
        .from("acomodadores")
        .select("id, nombre, apellido, congregacion, telefono, disponibilidad")
        .eq("asamblea_id", asamblea.id)
        .order("nombre", { ascending: true }),
      supabase
        .from("asignaciones")
        .select("acomodador_id, area_id, slot")
        .eq("asamblea_id", asamblea.id),
    ])

  return (
    <>
      <PageHeader parent="Asignaciones" title="Puestos" />
      <PuestosClient
        asamblea={asamblea}
        areas={areas ?? []}
        acomodadores={acomodadores ?? []}
        asignaciones={asignaciones ?? []}
      />
    </>
  )
}

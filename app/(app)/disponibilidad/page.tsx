import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { DisponibilidadView } from "./disponibilidad-view"

export default async function DisponibilidadPage() {
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
        <PageHeader parent="Personal" title="Disponibilidad" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para ver disponibilidad.
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
    { data: capitanes },
    { data: acomodadores },
    { data: hermanas },
  ] = await Promise.all([
    supabase
      .from("capitanes")
      .select(
        "id, nombre, apellido, area, telefono, disponibilidad, asistencia_confirmada",
      )
      .eq("asamblea_id", asamblea.id)
      .order("nombre", { ascending: true }),
    supabase
      .from("acomodadores")
      .select(
        "id, nombre, apellido, congregacion, telefono, capitan_id, access_token, disponibilidad, asistencia_confirmada, asistencia_self_confirmada",
      )
      .eq("asamblea_id", asamblea.id)
      .order("nombre", { ascending: true }),
    supabase
      .from("hermanas_apoyo")
      .select(
        "id, nombre, apellido, congregacion, telefono, capitan_id, access_token, disponibilidad, asistencia_confirmada, asistencia_self_confirmada",
      )
      .eq("asamblea_id", asamblea.id)
      .order("nombre", { ascending: true }),
  ])

  return (
    <>
      <PageHeader parent="Personal" title="Disponibilidad" />
      <DisponibilidadView
        asamblea={asamblea}
        capitanes={capitanes ?? []}
        acomodadores={acomodadores ?? []}
        hermanas={hermanas ?? []}
      />
    </>
  )
}

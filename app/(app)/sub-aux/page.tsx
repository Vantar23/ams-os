import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { SubAuxClient } from "./sub-aux-client"

export default async function SubAuxPage() {
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
        <PageHeader parent="Personal" title="Sub. y Aux." />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a registrar subcapitanes y
              auxiliares.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const [{ data: personas }, { data: areas }] = await Promise.all([
    supabase
      .from("sub_aux")
      .select(
        "id, role, nombre, apellido, congregacion, telefono, area, notas, disponibilidad, user_id, created_at",
      )
      .eq("asamblea_id", asamblea.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("areas")
      .select("id, piso, nombre")
      .eq("asamblea_id", asamblea.id)
      .order("piso", { ascending: true })
      .order("nombre", { ascending: true }),
  ])

  return (
    <>
      <PageHeader parent="Personal" title="Sub. y Aux." />
      <SubAuxClient
        asamblea={asamblea}
        personas={personas ?? []}
        areas={areas ?? []}
      />
    </>
  )
}

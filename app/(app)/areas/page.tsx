import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { AreasClient } from "./areas-client"

export default async function AreasPage() {
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
        <PageHeader parent="Lugar" title="Áreas" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a registrar áreas.
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
    .select(
      "id, piso, nombre, filas, acomodadores_necesarios, capacidad, created_at",
    )
    .eq("asamblea_id", asamblea.id)
    .order("piso", { ascending: true })
    .order("nombre", { ascending: true })

  return (
    <>
      <PageHeader parent="Lugar" title="Áreas" />
      <AreasClient asamblea={asamblea} areas={areas ?? []} />
    </>
  )
}

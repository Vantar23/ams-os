import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { CapitanesClient } from "./capitanes-client"

export default async function CapitanesPage() {
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
        <PageHeader parent="Personal" title="Capitanes" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a registrar capitanes.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const { data: capitanes } = await supabase
    .from("capitanes")
    .select(
      "id, nombre, apellido, congregacion, telefono, area, notas, disponibilidad, user_id, created_at",
    )
    .eq("asamblea_id", asamblea.id)
    .order("created_at", { ascending: false })

  return (
    <>
      <PageHeader parent="Personal" title="Capitanes" />
      <CapitanesClient asamblea={asamblea} capitanes={capitanes ?? []} />
    </>
  )
}

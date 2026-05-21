import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { AsistenciaClient, type Area } from "./asistencia-client"

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

  return (
    <>
      <PageHeader parent="Reportes" title="Asistencia" />
      <AsistenciaClient areas={(areas ?? []) as Area[]} />
    </>
  )
}

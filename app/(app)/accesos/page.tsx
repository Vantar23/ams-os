import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { AccesosClient } from "./accesos-client"

export default async function AccesosPage() {
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
        <PageHeader parent="Configuración" title="Accesos" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a compartir accesos.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const [{ data: areas }, { data: pases }] = await Promise.all([
    supabase
      .from("accesos_areas")
      .select("id, nombre, created_at")
      .eq("asamblea_id", asamblea.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("accesos_pases")
      .select(
        "id, area_id, access_token, nombre, telefono, device_bound_at, created_at",
      )
      .eq("asamblea_id", asamblea.id)
      .order("created_at", { ascending: false }),
  ])

  return (
    <>
      <PageHeader parent="Configuración" title="Accesos" />
      <AccesosClient
        asamblea={asamblea}
        areas={areas ?? []}
        pases={pases ?? []}
      />
    </>
  )
}

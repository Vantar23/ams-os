import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { MapaClient, type Mapa } from "./mapa-client"

export default async function MapaPage() {
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
        <PageHeader parent="Lugar" title="Mapa" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a registrar mapas.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const { data: mapas } = await supabase
    .from("mapas")
    .select("id, nombre, descripcion, storage_path, archivo, size")
    .eq("asamblea_id", asamblea.id)
    .order("created_at", { ascending: true })

  const items: Mapa[] = (mapas ?? []).map((m) => {
    const { data } = supabase.storage
      .from("mapas")
      .getPublicUrl(m.storage_path)
    return {
      id: m.id,
      nombre: m.nombre,
      descripcion: m.descripcion ?? "",
      url: data.publicUrl,
      archivo: m.archivo,
      size: Number(m.size),
    }
  })

  return (
    <>
      <PageHeader parent="Lugar" title="Mapa" />
      <MapaClient asambleaId={asamblea.id} mapas={items} />
    </>
  )
}

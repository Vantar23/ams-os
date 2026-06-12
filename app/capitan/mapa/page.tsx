import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { MapaImage } from "@/components/mapa-image"
import { createClient } from "@/lib/supabase/server"

import { loadCapitanActual } from "../load"

export default async function Page() {
  const actual = await loadCapitanActual()
  if (!actual) redirect("/acomodadores")
  const { asamblea } = actual

  const supabase = await createClient()
  const { data: mapas } = await supabase
    .from("mapas")
    .select("id, nombre, descripcion, storage_path")
    .eq("asamblea_id", asamblea.id)
    .order("created_at", { ascending: true })

  const items = (mapas ?? []).map((m) => {
    const { data } = supabase.storage
      .from("mapas")
      .getPublicUrl(m.storage_path as string)
    return {
      id: m.id as string,
      nombre: m.nombre as string,
      descripcion: (m.descripcion as string | null) ?? "",
      url: data.publicUrl,
    }
  })

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
        Mapa
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Planos del recinto para esta asamblea.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          Aún no hay mapas disponibles.
        </p>
      ) : (
        <ul className="mt-6 grid gap-10">
          {items.map((m) => (
            <li key={m.id}>
              <h2 className="font-serif text-xl">{m.nombre}</h2>
              {m.descripcion && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {m.descripcion}
                </p>
              )}
              <div className="mt-3">
                <MapaImage url={m.url} alt={m.nombre} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { MapaImage } from "@/components/mapa-image"
import { createClient } from "@/lib/supabase/server"

import { BlockedView } from "../blocked-view"
import { ClaimView } from "../claim-view"
import { loadAcomodadorByToken } from "../load"

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadAcomodadorByToken(access_token)

  if (result.kind === "blocked") {
    return <BlockedView reason={result.reason} message={result.message} />
  }
  if (result.kind === "claim") {
    return (
      <ClaimView
        accessToken={access_token}
        nombre={result.nombre}
        asamblea={result.asamblea}
      />
    )
  }

  type MapaRow = {
    id: string
    nombre: string
    descripcion: string | null
    storage_path: string
  }
  const supabase = await createClient()
  const { data: mapas } = await supabase.rpc("acceso_mapas", {
    p_access_token: access_token,
  })

  const items = ((mapas ?? []) as MapaRow[]).map((m) => {
    const { data } = supabase.storage
      .from("mapas")
      .getPublicUrl(m.storage_path)
    return {
      id: m.id,
      nombre: m.nombre,
      descripcion: m.descripcion ?? "",
      url: data.publicUrl,
    }
  })

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <Link
        href={`/acomodador/${access_token}`}
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

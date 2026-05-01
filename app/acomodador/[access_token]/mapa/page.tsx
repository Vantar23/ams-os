import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

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

  const { acomodador } = result
  const supabase = await createClient()
  const { data: areas } = await supabase
    .from("areas")
    .select("id, piso, nombre, filas, capacidad")
    .eq("asamblea_id", acomodador.asamblea_id)
    .order("piso", { ascending: true })
    .order("nombre", { ascending: true })

  const byPiso = new Map<string, typeof areas extends null | undefined ? [] : NonNullable<typeof areas>>()
  for (const a of areas ?? []) {
    const list = byPiso.get(a.piso) ?? []
    list.push(a)
    byPiso.set(a.piso, list)
  }

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
        Áreas registradas para la asamblea.
      </p>

      {(!areas || areas.length === 0) ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          Aún no hay áreas registradas.
        </p>
      ) : (
        <div className="mt-6 grid gap-6">
          {Array.from(byPiso.entries()).map(([piso, list]) => (
            <section key={piso}>
              <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {piso}
              </h2>
              <ul className="mt-2 grid gap-2">
                {list.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-surface px-4 py-3"
                  >
                    <span className="font-medium">{a.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.filas > 0 && `${a.filas} filas · `}
                      {a.capacidad > 0 && `cap. ${a.capacidad}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

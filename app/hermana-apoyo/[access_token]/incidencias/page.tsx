import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { IncidenciaForm } from "@/app/acomodador/[access_token]/incidencias/incidencia-form"

import { BlockedView } from "../blocked-view"
import { ClaimView } from "../claim-view"
import { loadHermanaByToken } from "../load"

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadHermanaByToken(access_token)

  if (result.kind === "blocked") {
    return (
      <BlockedView
        reason={result.reason}
        message={result.message}
        accessToken={access_token}
      />
    )
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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-5 sm:py-14">
      <Link
        href={`/hermana-apoyo/${access_token}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[1.75rem] leading-[1.15] text-foreground sm:text-4xl sm:leading-tight">
        Incidencias
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reporta lo que pase durante la asamblea para que tu capitán lo vea en
        tiempo real.
      </p>

      <IncidenciaForm accessToken={access_token} tipoPersonal="hermana" />
    </main>
  )
}
